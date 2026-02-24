namespace Faraday.API.Models;

[Flags]
public enum HazardType
{
    None = 0,
    Explosive = 1,
    Flammable = 2,
    SelfReactive = 4,
    Oxidizing = 8,
    Toxic = 16,
    Radioactive = 32,
    Corrosive = 64,
    Other = 128
}