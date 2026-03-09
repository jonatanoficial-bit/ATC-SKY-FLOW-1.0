export const DEFAULT_GAME_CONFIG = {
  "defaultPilotName": "Comandante Atlas",
  "starterCredits": 1800,
  "baseSpawnInterval": 6.2,
  "baseConflictRadius": 0.055,
  "sessionDuration": 180,
  "scorePerLanding": 135,
  "xpPerScoreUnit": 0.34,
  "creditPerScoreUnit": 0.46,
  "maxFlightsBase": 6,
  "softWarningDistance": 0.09,
  "uiRefreshMs": 220
};

export const FALLBACK_CONTENT_INDEX = {
  "version": "1.0.0",
  "packages": [
    {
      "id": "core",
      "manifest": "./core/manifest.json",
      "type": "core"
    },
    {
      "id": "dlc_north_atlantic",
      "manifest": "./dlc_north_atlantic/manifest.json",
      "type": "dlc"
    },
    {
      "id": "dlc_pacific_horizons",
      "manifest": "./dlc_pacific_horizons/manifest.json",
      "type": "dlc"
    }
  ]
};

export const FALLBACK_PACKAGE_MAP = {
  "core": {
    "id": "core",
    "type": "core",
    "version": "1.0.0",
    "title": "Global Core",
    "subtitle": "Rede inicial mundial",
    "description": "Base jogável com hubs globais, carreira inicial e sessões transatlânticas e euro-asiáticas.",
    "unlockRank": "cadet",
    "enabledByDefault": true,
    "theme": {
      "accent": "#72f6d5",
      "glow": "#6da9ff",
      "surface": "#0d1729"
    },
    "coverAsset": "./assets/branding/cover-core.svg",
    "datasets": {
      "airports": [
        {
          "id": "GRU",
          "iata": "GRU",
          "icao": "SBGR",
          "name": "São Paulo/Guarulhos",
          "city": "São Paulo",
          "country": "Brasil",
          "lat": -23.4356,
          "lon": -46.4731,
          "region": "south-america",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "GIG",
          "iata": "GIG",
          "icao": "SBGL",
          "name": "Rio de Janeiro/Galeão",
          "city": "Rio de Janeiro",
          "country": "Brasil",
          "lat": -22.809,
          "lon": -43.2506,
          "region": "south-america",
          "tier": "large",
          "traffic": 7,
          "hub": true
        },
        {
          "id": "BOG",
          "iata": "BOG",
          "icao": "SKBO",
          "name": "El Dorado",
          "city": "Bogotá",
          "country": "Colômbia",
          "lat": 4.7016,
          "lon": -74.1469,
          "region": "south-america",
          "tier": "large",
          "traffic": 7,
          "hub": true
        },
        {
          "id": "JFK",
          "iata": "JFK",
          "icao": "KJFK",
          "name": "John F. Kennedy",
          "city": "Nova York",
          "country": "Estados Unidos",
          "lat": 40.6413,
          "lon": -73.7781,
          "region": "north-america",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "ATL",
          "iata": "ATL",
          "icao": "KATL",
          "name": "Hartsfield-Jackson",
          "city": "Atlanta",
          "country": "Estados Unidos",
          "lat": 33.6407,
          "lon": -84.4277,
          "region": "north-america",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "LAX",
          "iata": "LAX",
          "icao": "KLAX",
          "name": "Los Angeles International",
          "city": "Los Angeles",
          "country": "Estados Unidos",
          "lat": 33.9416,
          "lon": -118.4085,
          "region": "north-america",
          "tier": "mega",
          "traffic": 9,
          "hub": true
        },
        {
          "id": "LHR",
          "iata": "LHR",
          "icao": "EGLL",
          "name": "Heathrow",
          "city": "Londres",
          "country": "Reino Unido",
          "lat": 51.47,
          "lon": -0.4543,
          "region": "europe",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "CDG",
          "iata": "CDG",
          "icao": "LFPG",
          "name": "Charles de Gaulle",
          "city": "Paris",
          "country": "França",
          "lat": 49.0097,
          "lon": 2.5479,
          "region": "europe",
          "tier": "mega",
          "traffic": 9,
          "hub": true
        },
        {
          "id": "FRA",
          "iata": "FRA",
          "icao": "EDDF",
          "name": "Frankfurt",
          "city": "Frankfurt",
          "country": "Alemanha",
          "lat": 50.0379,
          "lon": 8.5622,
          "region": "europe",
          "tier": "mega",
          "traffic": 9,
          "hub": true
        },
        {
          "id": "MAD",
          "iata": "MAD",
          "icao": "LEMD",
          "name": "Adolfo Suárez Madrid-Barajas",
          "city": "Madri",
          "country": "Espanha",
          "lat": 40.4983,
          "lon": -3.5676,
          "region": "europe",
          "tier": "large",
          "traffic": 8,
          "hub": true
        },
        {
          "id": "DXB",
          "iata": "DXB",
          "icao": "OMDB",
          "name": "Dubai International",
          "city": "Dubai",
          "country": "Emirados Árabes Unidos",
          "lat": 25.2532,
          "lon": 55.3657,
          "region": "middle-east",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "DEL",
          "iata": "DEL",
          "icao": "VIDP",
          "name": "Indira Gandhi International",
          "city": "Nova Délhi",
          "country": "Índia",
          "lat": 28.5562,
          "lon": 77.1,
          "region": "asia",
          "tier": "mega",
          "traffic": 8,
          "hub": true
        },
        {
          "id": "SIN",
          "iata": "SIN",
          "icao": "WSSS",
          "name": "Singapore Changi",
          "city": "Singapura",
          "country": "Singapura",
          "lat": 1.3644,
          "lon": 103.9915,
          "region": "asia",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "HND",
          "iata": "HND",
          "icao": "RJTT",
          "name": "Tokyo Haneda",
          "city": "Tóquio",
          "country": "Japão",
          "lat": 35.5494,
          "lon": 139.7798,
          "region": "asia",
          "tier": "mega",
          "traffic": 10,
          "hub": true
        },
        {
          "id": "SYD",
          "iata": "SYD",
          "icao": "YSSY",
          "name": "Sydney Kingsford Smith",
          "city": "Sydney",
          "country": "Austrália",
          "lat": -33.9399,
          "lon": 151.1753,
          "region": "oceania",
          "tier": "mega",
          "traffic": 8,
          "hub": true
        },
        {
          "id": "JNB",
          "iata": "JNB",
          "icao": "FAOR",
          "name": "O.R. Tambo",
          "city": "Joanesburgo",
          "country": "África do Sul",
          "lat": -26.1367,
          "lon": 28.241,
          "region": "africa",
          "tier": "large",
          "traffic": 7,
          "hub": true
        }
      ],
      "routes": [
        {
          "id": "GRU-JFK",
          "from": "GRU",
          "to": "JFK",
          "demand": 10,
          "bidirectional": true
        },
        {
          "id": "GRU-LHR",
          "from": "GRU",
          "to": "LHR",
          "demand": 9,
          "bidirectional": true
        },
        {
          "id": "GRU-MAD",
          "from": "GRU",
          "to": "MAD",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "GRU-DXB",
          "from": "GRU",
          "to": "DXB",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "GIG-CDG",
          "from": "GIG",
          "to": "CDG",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "BOG-ATL",
          "from": "BOG",
          "to": "ATL",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "JFK-LHR",
          "from": "JFK",
          "to": "LHR",
          "demand": 10,
          "bidirectional": true
        },
        {
          "id": "JFK-DXB",
          "from": "JFK",
          "to": "DXB",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "ATL-LAX",
          "from": "ATL",
          "to": "LAX",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "LAX-HND",
          "from": "LAX",
          "to": "HND",
          "demand": 8,
          "bidirectional": true
        },
        {
          "id": "LHR-DXB",
          "from": "LHR",
          "to": "DXB",
          "demand": 9,
          "bidirectional": true
        },
        {
          "id": "LHR-SIN",
          "from": "LHR",
          "to": "SIN",
          "demand": 8,
          "bidirectional": true
        },
        {
          "id": "CDG-DEL",
          "from": "CDG",
          "to": "DEL",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "FRA-SIN",
          "from": "FRA",
          "to": "SIN",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "MAD-BOG",
          "from": "MAD",
          "to": "BOG",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "DXB-HND",
          "from": "DXB",
          "to": "HND",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "DEL-SIN",
          "from": "DEL",
          "to": "SIN",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "SIN-SYD",
          "from": "SIN",
          "to": "SYD",
          "demand": 8,
          "bidirectional": true
        },
        {
          "id": "HND-SYD",
          "from": "HND",
          "to": "SYD",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "JNB-DXB",
          "from": "JNB",
          "to": "DXB",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "JNB-SIN",
          "from": "JNB",
          "to": "SIN",
          "demand": 5,
          "bidirectional": true
        },
        {
          "id": "GRU-JNB",
          "from": "GRU",
          "to": "JNB",
          "demand": 5,
          "bidirectional": true
        }
      ],
      "scenarios": [
        {
          "id": "core_atlantic_window",
          "packageId": "core",
          "title": "Janela Atlântica",
          "rankRequired": "cadet",
          "difficulty": "Cadete",
          "blurb": "Segure o fluxo entre América do Sul, América do Norte e Europa sem perder estabilidade.",
          "spawnInterval": 6.6,
          "maxActive": 6,
          "targetScore": 820,
          "duration": 180,
          "conflictRadius": 0.054,
          "preferredAirports": [
            "GRU",
            "JFK",
            "LHR",
            "MAD",
            "BOG",
            "GIG"
          ],
          "weatherCells": [
            {
              "id": "atlantic_front",
              "lat": 11,
              "lon": -29,
              "radius": 0.048,
              "label": "Frente Atlântica",
              "severity": 0.7
            },
            {
              "id": "med_crosswind",
              "lat": 38,
              "lon": 2,
              "radius": 0.03,
              "label": "Ventos Ibéricos",
              "severity": 0.4
            }
          ]
        },
        {
          "id": "core_desert_bridge",
          "packageId": "core",
          "title": "Ponte do Deserto",
          "rankRequired": "controller",
          "difficulty": "Oficial",
          "blurb": "Administre o corredor entre Europa, Golfo e Ásia sob alta pressão operacional.",
          "spawnInterval": 5.3,
          "maxActive": 7,
          "targetScore": 1180,
          "duration": 195,
          "conflictRadius": 0.057,
          "preferredAirports": [
            "LHR",
            "FRA",
            "CDG",
            "DXB",
            "DEL",
            "SIN"
          ],
          "weatherCells": [
            {
              "id": "gulf_heat",
              "lat": 25,
              "lon": 48,
              "radius": 0.036,
              "label": "Calor Convectivo",
              "severity": 0.65
            },
            {
              "id": "indian_jet",
              "lat": 19,
              "lon": 69,
              "radius": 0.04,
              "label": "Jet do Índico",
              "severity": 0.55
            }
          ]
        }
      ]
    }
  },
  "dlc_north_atlantic": {
    "id": "dlc_north_atlantic",
    "type": "dlc",
    "version": "1.0.0",
    "title": "North Atlantic Flow",
    "subtitle": "DLC do Atlântico Norte",
    "description": "Expansão com hubs do Atlântico Norte, corredores polares e mais densidade de fluxo.",
    "unlockRank": "controller",
    "enabledByDefault": false,
    "theme": {
      "accent": "#89d0ff",
      "glow": "#6da9ff",
      "surface": "#0f1c33"
    },
    "coverAsset": "./assets/branding/cover-atlantic.svg",
    "datasets": {
      "airports": [
        {
          "id": "BOS",
          "iata": "BOS",
          "icao": "KBOS",
          "name": "Boston Logan",
          "city": "Boston",
          "country": "Estados Unidos",
          "lat": 42.3656,
          "lon": -71.0096,
          "region": "north-america",
          "tier": "large",
          "traffic": 7,
          "hub": true
        },
        {
          "id": "YYZ",
          "iata": "YYZ",
          "icao": "CYYZ",
          "name": "Toronto Pearson",
          "city": "Toronto",
          "country": "Canadá",
          "lat": 43.6777,
          "lon": -79.6248,
          "region": "north-america",
          "tier": "mega",
          "traffic": 8,
          "hub": true
        },
        {
          "id": "LIS",
          "iata": "LIS",
          "icao": "LPPT",
          "name": "Humberto Delgado",
          "city": "Lisboa",
          "country": "Portugal",
          "lat": 38.7742,
          "lon": -9.1342,
          "region": "europe",
          "tier": "large",
          "traffic": 7,
          "hub": true
        },
        {
          "id": "KEF",
          "iata": "KEF",
          "icao": "BIKF",
          "name": "Keflavík",
          "city": "Reykjavík",
          "country": "Islândia",
          "lat": 63.985,
          "lon": -22.6056,
          "region": "europe",
          "tier": "medium",
          "traffic": 5,
          "hub": true
        },
        {
          "id": "DUB",
          "iata": "DUB",
          "icao": "EIDW",
          "name": "Dublin",
          "city": "Dublin",
          "country": "Irlanda",
          "lat": 53.4213,
          "lon": -6.2701,
          "region": "europe",
          "tier": "large",
          "traffic": 6,
          "hub": true
        },
        {
          "id": "AMS",
          "iata": "AMS",
          "icao": "EHAM",
          "name": "Amsterdam Schiphol",
          "city": "Amsterdã",
          "country": "Países Baixos",
          "lat": 52.3105,
          "lon": 4.7683,
          "region": "europe",
          "tier": "mega",
          "traffic": 9,
          "hub": true
        }
      ],
      "routes": [
        {
          "id": "BOS-DUB",
          "from": "BOS",
          "to": "DUB",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "YYZ-LHR",
          "from": "YYZ",
          "to": "LHR",
          "demand": 8,
          "bidirectional": true
        },
        {
          "id": "YYZ-AMS",
          "from": "YYZ",
          "to": "AMS",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "LIS-GRU",
          "from": "LIS",
          "to": "GRU",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "KEF-JFK",
          "from": "KEF",
          "to": "JFK",
          "demand": 5,
          "bidirectional": true
        },
        {
          "id": "DUB-LHR",
          "from": "DUB",
          "to": "LHR",
          "demand": 5,
          "bidirectional": true
        },
        {
          "id": "AMS-DXB",
          "from": "AMS",
          "to": "DXB",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "BOS-KEF",
          "from": "BOS",
          "to": "KEF",
          "demand": 4,
          "bidirectional": true
        },
        {
          "id": "LIS-MAD",
          "from": "LIS",
          "to": "MAD",
          "demand": 4,
          "bidirectional": true
        }
      ],
      "scenarios": [
        {
          "id": "north_ice_corridor",
          "packageId": "dlc_north_atlantic",
          "title": "Corredor Polar",
          "rankRequired": "controller",
          "difficulty": "Oficial+",
          "blurb": "A malha do Atlântico Norte cresce com desvios frios e slots apertados.",
          "spawnInterval": 5.2,
          "maxActive": 8,
          "targetScore": 1320,
          "duration": 200,
          "conflictRadius": 0.058,
          "preferredAirports": [
            "BOS",
            "YYZ",
            "KEF",
            "DUB",
            "LHR",
            "AMS",
            "JFK"
          ],
          "weatherCells": [
            {
              "id": "polar_wave",
              "lat": 58,
              "lon": -34,
              "radius": 0.05,
              "label": "Ondulação Polar",
              "severity": 0.75
            },
            {
              "id": "irish_shear",
              "lat": 53,
              "lon": -10,
              "radius": 0.028,
              "label": "Shear Irlandês",
              "severity": 0.45
            }
          ]
        }
      ]
    }
  },
  "dlc_pacific_horizons": {
    "id": "dlc_pacific_horizons",
    "type": "dlc",
    "version": "1.0.0",
    "title": "Pacific Horizons",
    "subtitle": "DLC do Pacífico",
    "description": "Expansão com trechos transoceânicos longos, hubs asiáticos adicionais e pressão de separação.",
    "unlockRank": "director",
    "enabledByDefault": false,
    "theme": {
      "accent": "#ffd37b",
      "glow": "#8f7bff",
      "surface": "#111a31"
    },
    "coverAsset": "./assets/branding/cover-pacific.svg",
    "datasets": {
      "airports": [
        {
          "id": "AKL",
          "iata": "AKL",
          "icao": "NZAA",
          "name": "Auckland",
          "city": "Auckland",
          "country": "Nova Zelândia",
          "lat": -37.0082,
          "lon": 174.785,
          "region": "oceania",
          "tier": "large",
          "traffic": 6,
          "hub": true
        },
        {
          "id": "HNL",
          "iata": "HNL",
          "icao": "PHNL",
          "name": "Honolulu",
          "city": "Honolulu",
          "country": "Estados Unidos",
          "lat": 21.3187,
          "lon": -157.9225,
          "region": "oceania",
          "tier": "medium",
          "traffic": 5,
          "hub": true
        },
        {
          "id": "SFO",
          "iata": "SFO",
          "icao": "KSFO",
          "name": "San Francisco International",
          "city": "San Francisco",
          "country": "Estados Unidos",
          "lat": 37.6213,
          "lon": -122.379,
          "region": "north-america",
          "tier": "mega",
          "traffic": 8,
          "hub": true
        },
        {
          "id": "ICN",
          "iata": "ICN",
          "icao": "RKSI",
          "name": "Incheon",
          "city": "Seul",
          "country": "Coreia do Sul",
          "lat": 37.4602,
          "lon": 126.4407,
          "region": "asia",
          "tier": "mega",
          "traffic": 8,
          "hub": true
        },
        {
          "id": "NRT",
          "iata": "NRT",
          "icao": "RJAA",
          "name": "Narita",
          "city": "Tóquio",
          "country": "Japão",
          "lat": 35.7719,
          "lon": 140.3929,
          "region": "asia",
          "tier": "large",
          "traffic": 7,
          "hub": true
        },
        {
          "id": "PPT",
          "iata": "PPT",
          "icao": "NTAA",
          "name": "Faa'a International",
          "city": "Papeete",
          "country": "Polinésia Francesa",
          "lat": -17.5537,
          "lon": -149.6067,
          "region": "oceania",
          "tier": "medium",
          "traffic": 3,
          "hub": true
        }
      ],
      "routes": [
        {
          "id": "SFO-HNL",
          "from": "SFO",
          "to": "HNL",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "HNL-AKL",
          "from": "HNL",
          "to": "AKL",
          "demand": 5,
          "bidirectional": true
        },
        {
          "id": "SFO-ICN",
          "from": "SFO",
          "to": "ICN",
          "demand": 7,
          "bidirectional": true
        },
        {
          "id": "NRT-SYD",
          "from": "NRT",
          "to": "SYD",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "AKL-SYD",
          "from": "AKL",
          "to": "SYD",
          "demand": 6,
          "bidirectional": true
        },
        {
          "id": "SIN-AKL",
          "from": "SIN",
          "to": "AKL",
          "demand": 5,
          "bidirectional": true
        },
        {
          "id": "ICN-HND",
          "from": "ICN",
          "to": "HND",
          "demand": 5,
          "bidirectional": true
        },
        {
          "id": "PPT-LAX",
          "from": "PPT",
          "to": "LAX",
          "demand": 3,
          "bidirectional": true
        },
        {
          "id": "PPT-AKL",
          "from": "PPT",
          "to": "AKL",
          "demand": 3,
          "bidirectional": true
        }
      ],
      "scenarios": [
        {
          "id": "pacific_sunset_grid",
          "packageId": "dlc_pacific_horizons",
          "title": "Horizonte Pacífico",
          "rankRequired": "director",
          "difficulty": "Diretor",
          "blurb": "Controle rotas longas sobre o Pacífico com visibilidade variável e grandes separações.",
          "spawnInterval": 4.9,
          "maxActive": 9,
          "targetScore": 1580,
          "duration": 210,
          "conflictRadius": 0.06,
          "preferredAirports": [
            "SFO",
            "HNL",
            "AKL",
            "ICN",
            "NRT",
            "SYD",
            "PPT"
          ],
          "weatherCells": [
            {
              "id": "pacific_cells",
              "lat": 12,
              "lon": -153,
              "radius": 0.055,
              "label": "Células Tropicais",
              "severity": 0.7
            },
            {
              "id": "tasman_wind",
              "lat": -34,
              "lon": 163,
              "radius": 0.04,
              "label": "Tasman Drift",
              "severity": 0.6
            }
          ]
        }
      ]
    }
  }
};