using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace RelicTracker.Models;

public class MapNodeData
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "*";

    [JsonPropertyName("parents")]
    public List<int> Parents { get; set; } = new();
}
