using System;
using System.Threading;
using System.Threading.Tasks;
using Godot;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
using MegaCrit.Sts2.Core.Runs;
using RelicTracker.Serialization;

namespace RelicTracker;

[ModInitializer("Initialize")]
public class RelicTrackerMod
{
    private static Config? _config;
    private static BackendClient? _client;
    private static StateExporter? _exporter;
    private static CancellationTokenSource? _cts;
    private static bool _wasInRun;

    public static void Initialize()
    {
        Log.Info("[RelicTracker] Initializing v0.2.0");

        try
        {
            _config = Config.Load();
            _client = new BackendClient(_config);
            _exporter = new StateExporter(_config);

            ModConfigBridge.OnConnectTwitch = () => _ = RunAuthThenPoll();
            ModConfigBridge.IsAuthenticated = () => _config?.IsAuthenticated == true;
            ModConfigBridge.DeferredRegister();

            if (!_config.IsAuthenticated)
            {
                Log.Info("[RelicTracker] No credentials found, starting auth flow...");
                _ = RunAuthThenPoll();
                return;
            }

            StartPolling();
            Log.Info("[RelicTracker] Started polling loop");
        }
        catch (Exception ex)
        {
            Log.Error($"[RelicTracker] Failed to initialize: {ex}");
        }
    }

    private static async Task RunAuthThenPoll()
    {
        try
        {
            var auth = new AuthServer(_config!);
            var success = await auth.Authenticate();
            if (!success)
            {
                Log.Warn("[RelicTracker] Auth failed. Mod will not export game state.");
                return;
            }

            _client = new BackendClient(_config!);
            Callable.From(ModConfigBridge.UpdateStatusLabel).CallDeferred();
            StartPolling();
            Log.Info("[RelicTracker] Auth complete, started polling loop");
        }
        catch (Exception ex)
        {
            Log.Error($"[RelicTracker] Auth flow error: {ex}");
        }
    }

    private static void StartPolling()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = new CancellationTokenSource();
        var token = _cts.Token;

        Task.Run(async () =>
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    await PollOnce();
                    await Task.Delay(ModConfigBridge.PollIntervalMs, token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Log.Warn($"[RelicTracker] Poll error: {ex.Message}");
                }
            }
        }, token);
    }

    private static Task<T> RunOnMainThread<T>(Func<T> func)
    {
        var tcs = new TaskCompletionSource<T>();
        Callable.From(() =>
        {
            try
            {
                tcs.SetResult(func());
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
        }).CallDeferred();
        return tcs.Task;
    }

    private static async Task PollOnce()
    {
        try
        {
            var inRun = RunManager.Instance.IsInProgress;

            if (inRun && !_wasInRun)
                _exporter!.ResetIndex();

            _wasInRun = inRun;

            if (!inRun) return;

            // Game state must be read on the main thread (Godot is not thread-safe).
            var state = await RunOnMainThread(() => _exporter!.Export());

            if (state != null)
            {
                var delayMs = ModConfigBridge.Delay;
                if (delayMs > 0)
                    await Task.Delay(delayMs);

                await _client!.PostGameState(state, SerializerOptions.Default);
            }
        }
        catch (Exception ex)
        {
            Log.Warn($"[RelicTracker] PollOnce error: {ex.Message}");
        }
    }
}
