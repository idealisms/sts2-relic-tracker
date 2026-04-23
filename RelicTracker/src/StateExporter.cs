using System;
using System.Collections.Generic;
using System.Linq;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using RelicTracker.Models;

namespace RelicTracker;

public class StateExporter
{
    private readonly Config _config;
    private int _gameStateIndex;
    private Guid _runId = Guid.NewGuid();

    public StateExporter(Config config)
    {
        _config = config;
    }

    public ExportedState? Export()
    {
        try
        {
            var runManager = RunManager.Instance;
            if (!runManager.IsInProgress)
                return null;

            var runState = runManager.DebugOnlyGetState();
            if (runState == null)
                return null;

            var player = runState.Players.FirstOrDefault();
            if (player == null)
                return null;

            var state = new ExportedState
            {
                RunId = _runId.ToString(),
                Seed = runState.Rng.StringSeed,
                GameStateIndex = _gameStateIndex++,
                Channel = _config.Channel,
                Game = "sts2",
                Character = GetCharacterName(player),
            };

            ExportRelics(player, state);

            return state;
        }
        catch (Exception ex)
        {
            Log.Warn($"[RelicTracker] Export failed: {ex.Message}");
            return null;
        }
    }

    public void ResetIndex()
    {
        _gameStateIndex = 0;
        _runId = Guid.NewGuid();
    }

    private static string GetCharacterName(Player player)
    {
        try
        {
            return player.Character.Title.GetFormattedText();
        }
        catch
        {
            return player.Character.Id.ToString();
        }
    }

    private static void ExportRelics(Player player, ExportedState state)
    {
        var relicTipMap = new Dictionary<string, List<TipData>>();

        foreach (var relic in player.Relics)
        {
            try
            {
                var name = relic.Title.GetFormattedText();
                state.Relics.Add(name);
                var tips = TipExporter.RelicTips(relic);
                relicTipMap[name] = tips.Count > 0
                    ? tips
                    : new List<TipData> { new() { Header = name, Description = "" } };
            }
            catch (Exception ex)
            {
                Log.Warn($"[RelicTracker] Failed to export relic {relic.Id}: {ex.Message}");
                state.Relics.Add(relic.Id.ToString());
            }
        }

        state.RelicTipMap = relicTipMap.Count > 0 ? relicTipMap : null;
    }
}
