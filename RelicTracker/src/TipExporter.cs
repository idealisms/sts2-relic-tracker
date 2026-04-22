using System;
using System.Collections.Generic;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Models;
using RelicTracker.Models;

namespace RelicTracker;

public static class TipExporter
{
    private static string LocalizedEnergyLabel =>
        new LocString("static_hover_tips", "ENERGY.title").GetFormattedText();

    private static string LocalizedStarLabel =>
        new LocString("static_hover_tips", "STAR_COUNT.title").GetFormattedText();

    public static TipData FromHoverTip(IHoverTip tip)
    {
        try
        {
            var data = new TipData();

            if (tip is HoverTip ht)
            {
                data.Header = ht.Title ?? "";
                data.Description = InlineImageReplacer.Replace(ht.Description ?? "", LocalizedEnergyLabel, LocalizedStarLabel);
            }
            else if (tip is CardHoverTip cht)
            {
                var card = cht.Card;
                data.Header = card.Title ?? "";
                var idEntry = card.Id.Entry.ToLowerInvariant();
                var suffix = card.IsUpgraded ? "plusone" : "";
                data.Img = $"assets/sts2/card-images/{idEntry}{suffix}.png";
                data.Type = "card";
            }
            else
            {
                data.Header = tip.Id ?? "";
                data.Description = "";
            }

            return data;
        }
        catch (Exception ex)
        {
            Log.Warn($"[RelicTracker] Failed to export hover tip: {ex.Message}");
            return new TipData { Header = tip?.Id ?? "", Description = "" };
        }
    }

    public static List<TipData> FromHoverTips(IEnumerable<IHoverTip> tips)
    {
        var result = new List<TipData>();
        foreach (var tip in tips)
        {
            try
            {
                result.Add(FromHoverTip(tip));
            }
            catch (Exception ex)
            {
                Log.Warn($"[RelicTracker] Skipping hover tip: {ex.Message}");
            }
        }
        return result;
    }

    public static List<TipData> RelicTips(RelicModel relic)
    {
        try
        {
            return FromHoverTips(relic.HoverTips);
        }
        catch
        {
            Log.Warn($"[RelicTracker] Failed to get HoverTips for relic {relic.Id}");
            return new List<TipData>
            {
                new() { Header = relic.Title?.GetFormattedText() ?? relic.Id.ToString(), Description = "" }
            };
        }
    }
}
