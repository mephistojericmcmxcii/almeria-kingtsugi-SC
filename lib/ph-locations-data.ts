// This is a simplified mock data structure for demonstration purposes.
// In a real application, you would use a comprehensive dataset,
// potentially from an npm package like 'ph-locations' or an API.

interface CityMunicipality {
  name: string
  // Add other properties if needed, e.g., postalCode
}

interface Province {
  name: string
  citiesMunicipalities: CityMunicipality[]
}

interface Region {
  name: string
  provinces: Province[]
}

const PH_LOCATIONS_DATA: Region[] = [
  {
    name: "Eastern Visayas (Region VIII)",
    provinces: [
      {
        name: "Biliran",
        citiesMunicipalities: [
          { name: "Almeria" },
          { name: "Biliran" },
          { name: "Cabucgayan" },
          { name: "Caibiran" },
          { name: "Culaba" },
          { name: "Kawayan" },
          { name: "Maripipi" },
          { name: "Naval" },
        ],
      },
      {
        name: "Eastern Samar",
        citiesMunicipalities: [
          { name: "Borongan" },
          { name: "Arteche" },
          { name: "Balangiga" },
          { name: "Balangkayan" },
          { name: "Can-Avid" },
          { name: "Dolores" },
          { name: "General MacArthur" },
          { name: "Giporlos" },
          { name: "Guiuan" },
          { name: "Hernani" },
          { name: "Jipapad" },
          { name: "Lawaan" },
          { name: "Llorente" },
          { name: "Maslog" },
          { name: "Maydolong" },
          { name: "Mercedes" },
          { name: "Oras" },
          { name: "Quinapondan" },
          { name: "Salcedo" },
          { name: "San Julian" },
          { name: "San Policarpo" },
          { name: "Sulat" },
          { name: "Taft" },
        ],
      },
      {
        name: "Leyte",
        citiesMunicipalities: [
          { name: "Abuyog" },
          { name: "Alangalang" },
          { name: "Albuera" },
          { name: "Babatngon" },
          { name: "Barugo" },
          { name: "Bato" },
          { name: "Baybay" },
          { name: "Burauen" },
          { name: "Calubian" },
          { name: "Capoocan" },
          { name: "Carigara" },
          { name: "Dagami" },
          { name: "Dulag" },
          { name: "Hilongos" },
          { name: "Hindang" },
          { name: "Inopacan" },
          { name: "Isabel" },
          { name: "Jaro" },
          { name: "Javier" },
          { name: "Julita" },
          { name: "Kananga" },
          { name: "La Paz" },
          { name: "Leyte" },
          { name: "MacArthur" },
          { name: "Mahaplag" },
          { name: "Matag-ob" },
          { name: "Matalom" },
          { name: "Mayorga" },
          { name: "Merida" },
          { name: "Ormoc" },
          { name: "Palo" },
          { name: "Palompon" },
          { name: "Pastrana" },
          { name: "San Isidro" },
          { name: "San Miguel" },
          { name: "Santa Fe" },
          { name: "Tabango" },
          { name: "Tabontabon" },
          { name: "Tacloban" },
          { name: "Tanauan" },
          { name: "Tolosa" },
          { name: "Tunga" },
          { name: "Villaba" },
        ],
      },
      {
        name: "Northern Samar",
        citiesMunicipalities: [
          { name: "Allen" },
          { name: "Biri" },
          { name: "Bobon" },
          { name: "Capul" },
          { name: "Catarman" },
          { name: "Catubig" },
          { name: "Gamay" },
          { name: "Laoang" },
          { name: "Lapinig" },
          { name: "Las Navas" },
          { name: "Lavezares" },
          { name: "Lope de Vega" },
          { name: "Mapanas" },
          { name: "Mondragon" },
          { name: "Palapag" },
          { name: "Pambujan" },
          { name: "Rosario" },
          { name: "San Antonio" },
          { name: "San Isidro" },
          { name: "San Jose" },
          { name: "San Roque" },
          { name: "San Vicente" },
          { name: "Silvino Lobos" },
          { name: "Victoria" },
        ],
      },
      {
        name: "Samar",
        citiesMunicipalities: [
          { name: "Calbayog" },
          { name: "Catbalogan" },
          { name: "Almagro" },
          { name: "Basey" },
          { name: "Calbiga" },
          { name: "Daram" },
          { name: "Gandara" },
          { name: "Hinabangan" },
          { name: "Jiabong" },
          { name: "Marabut" },
          { name: "Matuguinao" },
          { name: "Motiong" },
          { name: "Pagsanghan" },
          { name: "Paranas" },
          { name: "Pinabacdao" },
          { name: "San Jorge" },
          { name: "San Jose de Buan" },
          { name: "San Sebastian" },
          { name: "Santa Margarita" },
          { name: "Santa Rita" },
          { name: "Santo Niño" },
          { name: "Tagapul-an" },
          { name: "Talalora" },
          { name: "Tarangnan" },
          { name: "Villareal" },
          { name: "Zumarraga" },
        ],
      },
      {
        name: "Southern Leyte",
        citiesMunicipalities: [
          { name: "Maasin" },
          { name: "Anahawan" },
          { name: "Bontoc" },
          { name: "Hinunangan" },
          { name: "Hinundayan" },
          { name: "Libagon" },
          { name: "Liloan" },
          { name: "Limasawa" },
          { name: "Macrohon" },
          { name: "Malitbog" },
          { name: "Padre Burgos" },
          { name: "Pintuyan" },
          { name: "Saint Bernard" },
          { name: "San Francisco" },
          { name: "San Juan" },
          { name: "San Ricardo" },
          { name: "Silago" },
          { name: "Sogod" },
          { name: "Tomas Oppus" },
        ],
      },
    ],
  },
]

export function getRegions(): string[] {
  return PH_LOCATIONS_DATA.map((region) => region.name)
}

export function getProvincesByRegion(regionName: string): string[] {
  const region = PH_LOCATIONS_DATA.find((r) => r.name === regionName)
  return region ? region.provinces.map((p) => p.name) : []
}

export function getCitiesMunicipalitiesByProvince(regionName: string, provinceName: string): string[] {
  const region = PH_LOCATIONS_DATA.find((r) => r.name === regionName)
  if (region) {
    const province = region.provinces.find((p) => p.name === provinceName)
    return province ? province.citiesMunicipalities.map((c) => c.name) : []
  }
  return []
}
