// Rank constants for dropdowns
export const RANKS = [
  "APC",
  "CPC",
  "WPC",
  "PCW",
  "PC",
  "AHC",
  "CHC",
  "WHC",
  "HCW",
  "HC",
  "ASI",
  "ARSI",
  "WASI",
  "ASIW",
  "RSI",
  "PSI",
  "WPSI",
  "PSIW",
  "RPI",
  "CPI",
  "PI",
  "PIW",
  "WPI",
  "DYSP",
  "SDA",
  "FDA",
  "SS",
  "GHA",
  "AO",
  "Typist",
  "Steno",
  "PA",
] as const;

// Ranks that require a metal number
export const RANKS_REQUIRING_METAL_NUMBER = [
  "APC",
  "CPC",
  "WPC",
  "PC",
  "AHC",
  "CHC",
  "WHC",
  "HC",
] as const;

// Blood groups
export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "??", // Unknown/Not updated
] as const;

// Units
export const UNITS = [
  "Admin", "ASC Team", "BDDS", "C Room", "CAR", "CCB", "CCRB", "CDR", "CEN", "CID",
  "Coast Guard", "Computer", "Court", "CSB", "CSP", "DAR", "DCIB", "DCRB", "DCRE",
  "Dog Squad", "DSB", "ERSS", "ESCOM", "Excise", "Fire", "Forest", "FPB", "FRRO",
  "FSL", "Guest House", "Health", "Home Guard", "INT", "ISD", "KLA", "L&O",
  "Ministrial", "Minisrial", "Others", "Prison", "PTS", "Railway", "RTO",
  "S INT", "Social Media", "Toll", "Traffic", "VVIP", "Wireless"
] as const;

