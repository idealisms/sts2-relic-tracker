using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace RelicTracker.Models;

public class ExportedState
{
    [JsonPropertyName("gameStateIndex")]
    public int GameStateIndex { get; set; }

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = "";

    [JsonPropertyName("game")]
    public string Game { get; set; } = "sts2";

    [JsonPropertyName("character")]
    public string Character { get; set; } = "";

    [JsonPropertyName("relics")]
    public List<string> Relics { get; set; } = new();

    [JsonPropertyName("relicTipMap")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, List<TipData>>? RelicTipMap { get; set; }
}
