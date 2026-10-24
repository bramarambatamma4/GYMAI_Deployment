/** States / provinces / regions per country (names match Intl.DisplayNames English output). Other countries use free text. */
const list = (s: string) => s.split('|')
export const STATES: Record<string, string[]> = {
  India: list('Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Andaman and Nicobar Islands|Chandigarh|Dadra and Nagar Haveli and Daman and Diu|Delhi|Jammu and Kashmir|Ladakh|Lakshadweep|Puducherry'),
  'United States': list('Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'),
  'United Kingdom': list('England|Scotland|Wales|Northern Ireland'),
  Canada: list('Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan|Northwest Territories|Nunavut|Yukon'),
  Australia: list('New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Australian Capital Territory|Northern Territory'),
  Pakistan: list('Punjab|Sindh|Khyber Pakhtunkhwa|Balochistan|Islamabad Capital Territory|Gilgit-Baltistan|Azad Jammu and Kashmir'),
  Bangladesh: list('Barishal|Chattogram|Dhaka|Khulna|Mymensingh|Rajshahi|Rangpur|Sylhet'),
  Nepal: list('Koshi|Madhesh|Bagmati|Gandaki|Lumbini|Karnali|Sudurpashchim'),
  'Sri Lanka': list('Central|Eastern|North Central|Northern|North Western|Sabaragamuwa|Southern|Uva|Western'),
  'United Arab Emirates': list('Abu Dhabi|Dubai|Sharjah|Ajman|Umm Al Quwain|Ras Al Khaimah|Fujairah'),
  Germany: list('Baden-Württemberg|Bavaria|Berlin|Brandenburg|Bremen|Hamburg|Hesse|Lower Saxony|Mecklenburg-Vorpommern|North Rhine-Westphalia|Rhineland-Palatinate|Saarland|Saxony|Saxony-Anhalt|Schleswig-Holstein|Thuringia'),
  Malaysia: list('Johor|Kedah|Kelantan|Malacca|Negeri Sembilan|Pahang|Penang|Perak|Perlis|Sabah|Sarawak|Selangor|Terengganu|Kuala Lumpur|Labuan|Putrajaya'),
}

let cached: string[] | null = null
/** Every country name, from the browser's built-in region names (no network needed). */
export function getCountries(): string[] {
  if (cached) return cached
  const out = new Set<string>(Object.keys(STATES))
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b)
      const name = names.of(code)
      if (name && name !== code && !/unknown|european union|united nations/i.test(name)) out.add(name)
    }
  } catch { /* old browser: keep the built-in list */ }
  cached = Array.from(out).sort((x, y) => x.localeCompare(y))
  return cached
}

export const AREAS: Record<string, Record<string, string[]>> = {
  India: {
    Karnataka: ['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Shivamogga','Tumakuru','Ballari'],
    Maharashtra: ['Mumbai','Pune','Nagpur','Nashik','Thane','Aurangabad','Kolhapur','Navi Mumbai'],
    'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tiruppur','Vellore','Erode'],
    Telangana: ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam'],
    Kerala: ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Kannur'],
    'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Tirupati','Nellore','Kurnool'],
    Delhi: ['New Delhi','Delhi'], Gujarat: ['Ahmedabad','Surat','Vadodara','Rajkot','Gandhinagar'],
    Rajasthan: ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner'],
    'West Bengal': ['Kolkata','Howrah','Durgapur','Siliguri','Asansol'],
    'Uttar Pradesh': ['Lucknow','Noida','Kanpur','Agra','Varanasi','Prayagraj','Ghaziabad','Meerut'],
    Haryana: ['Gurugram','Faridabad','Panipat','Ambala','Hisar','Karnal'], Punjab: ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda'],
    Odisha: ['Bhubaneswar','Cuttack','Rourkela','Puri','Berhampur'], Bihar: ['Patna','Gaya','Bhagalpur','Muzaffarpur','Darbhanga'],
    Goa: ['Panaji','Margao','Vasco da Gama','Mapusa'], 'Madhya Pradesh': ['Bhopal','Indore','Gwalior','Jabalpur','Ujjain'],
    Chhattisgarh: ['Raipur','Bhilai','Bilaspur','Korba'], Jharkhand: ['Ranchi','Jamshedpur','Dhanbad','Bokaro'],
    Uttarakhand: ['Dehradun','Haridwar','Haldwani','Rishikesh'], 'Himachal Pradesh': ['Shimla','Dharamshala','Manali','Solan'],
    Assam: ['Guwahati','Dibrugarh','Silchar','Jorhat'], 'Jammu and Kashmir': ['Srinagar','Jammu','Anantnag'],
    Puducherry: ['Puducherry'], Chandigarh: ['Chandigarh'], Sikkim: ['Gangtok'], Meghalaya: ['Shillong'],
    Manipur: ['Imphal'], Mizoram: ['Aizawl'], Nagaland: ['Kohima','Dimapur'], Tripura: ['Agartala'], 'Arunachal Pradesh': ['Itanagar'],
  },
}

export function getAreas(country: string, state: string): string[] {
  return AREAS[country]?.[state]?.length ? AREAS[country][state] : ['Other']
}
