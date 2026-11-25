// Location and inhabitant tables, TPV pp. 116–119.
export const districtTables = {
  "Slum": [
    [[15, "Shantytown"], [30, "Alleyway"], [45, "Tenement"], [55, "Camp/squat"], [65, "Vacant lot"], [71, "Street market"], [77, "Shop/pawnshop"], [83, "Ruin/abandoned"], [88, "Waste/trash site"], [90, "Black market"], [92, "Charity outpost"], [94, "Illegal clinic"], [96, "Street school"], [98, "Criminal den"], [100, "Fighting pit"]],
    [[15, "Beggar/addict"], [30, "Street vendor"], [45, "Orphan/runaway"], [55, "Scavenger"], [65, "Thief/criminal"], [71, "Gang member"], [77, "Prostitute/escort"], [83, "Immigrant/refugee"], [88, "Dealer/smuggler"], [90, "Tough/heavy"], [92, "Unlicensed doctor"], [94, "Fixer/loan shark"], [96, "Charity worker"], [98, "Revolutionary"], [100, "Corrupt authority"]],
  ],
  "Residential": [
    [[15, "Residential street"], [30, "Apartment"], [45, "House/row house"], [55, "Park/playground"], [65, "Shop"], [71, "Parking garage"], [77, "Bar/café/diner"], [83, "School"], [88, "Condominium"], [90, "Clinic"], [92, "Plaza"], [94, "Pool/gym"], [96, "Daycare center"], [98, "Retirement home"], [100, "Gated community"]],
    [[15, "Commuter"], [30, "Student/child"], [45, "Retiree"], [55, "Homemaker"], [65, "Service worker"], [71, "Courier/carrier"], [77, "Tradesperson"], [83, "Teacher"], [88, "Landlord"], [90, "Housekeeper"], [92, "Security/police"], [94, "Sitter/gardener"], [96, "Fitness instructor"], [98, "Real estate agent"], [100, "Local politician"]],
  ],
  "Industrial": [
    [[15, "Factory"], [30, "Warehouse"], [45, "Loading dock"], [55, "Workshop"], [65, "Shipping yard"], [71, "Power plant"], [77, "Distribution center"], [83, "Construction site"], [88, "Scrapyard"], [90, "Industrial park"], [92, "Refinery/foundry"], [94, "Vehicle lot/depot"], [96, "Corporate office"], [98, "Chemical plant"], [100, "Roll TRANSIT"]],
    [[15, "Factory worker"], [30, "Machine operator"], [45, "Driver"], [55, "Cargo handler"], [65, "Constructor"], [71, "Technician"], [77, "Machinist/welder"], [83, "Engineer/chemist"], [88, "Custodian"], [90, "Supervisor"], [92, "Safety inspector"], [94, "Security guard"], [96, "Impact assessor"], [98, "Union rep"], [100, "Corporate rep"]],
  ],
  "Transit": [
    [[15, "Rail station"], [30, "Vehicle lot/depot"], [45, "Overpass"], [55, "Vehicle rental"], [65, "Interchange"], [71, "Freight terminal"], [77, "Seaport/docks"], [83, "Airport/skydock"], [88, "Spacedock/port"], [90, "Shipping depot"], [92, "Vacant zone"], [94, "Customs office"], [96, "Logistics center"], [98, "Control tower"], [100, "Roll INDUSTRIAL"]],
    [[15, "Roll MIXED"], [30, "Driver"], [45, "Security/police"], [55, "Transit officer"], [65, "Conductor"], [71, "Courier/carrier"], [77, "Cargo handler"], [83, "Attendant"], [88, "Station manager"], [90, "Technician"], [92, "Tourist"], [94, "Guide"], [96, "Travel agent"], [98, "Logistician"], [100, "Customs officer"]],
  ],
  "Commercial": [
    [[15, "Shop/boutique"], [30, "Bar/café"], [45, "Restaurant"], [55, "Mall"], [65, "Supermarket"], [71, "Office building"], [77, "Street market"], [83, "Tech store"], [88, "Pharmacy"], [90, "Bank"], [92, "Salon/parlor"], [94, "Hotel/motel"], [96, "Theater/cinema"], [98, "Arena/stadium"], [100, "Financial/Corporate"]],
    [[15, "Customer (MIXED)"], [30, "Salesperson"], [45, "Server/attendant"], [55, "Office worker"], [65, "Security/police"], [71, "Manager"], [77, "Street vendor"], [83, "Custodian"], [88, "Driver"], [90, "Hospitality staff"], [92, "Chef/cook"], [94, "Tourist"], [96, "Stylist/artist"], [98, "Hawker/promoter"], [100, "Tech support"]],
  ],
  "Financial/Corporate": [
    [[15, "Office building"], [30, "Skyscraper"], [45, "Plaza"], [55, "Bank"], [65, "Investment firm"], [71, "Accounting firm"], [77, "Law firm"], [83, "Consulting agency"], [88, "Real estate office"], [90, "Insurance agency"], [92, "Conference center"], [94, "Data center"], [96, "Stock exchange"], [98, "Corporate HQ"], [100, "Roll COMMERCIAL"]],
    [[15, "Office worker"], [30, "Security/police"], [45, "Accountant"], [55, "IT specialist"], [65, "Analyst"], [71, "Custodian"], [77, "Consultant"], [83, "Insurance agent"], [88, "Real estate agent"], [90, "Lawyer"], [92, "Executive"], [94, "Investor"], [96, "Stockbroker"], [98, "Lobbyist"], [100, "CEO/board member"]],
  ],
  "Religious/Historic": [
    [[15, "Residence/hostel"], [30, "Shrine/chapel"], [45, "Temple/church"], [55, "Graveyard"], [65, "Religious school"], [71, "Museum"], [77, "Pilgrimage site"], [83, "Library/archive"], [88, "Monastery"], [90, "Cultural center"], [92, "Park/garden"], [94, "Festival grounds"], [96, "Monument"], [98, "Heritage building"], [100, "Great temple"]],
    [[15, "Devotee (MIXED)"], [30, "Pilgrim/tourist"], [45, "Monk/nun"], [55, "Priest/clergy"], [65, "Security/police"], [71, "Street vendor"], [77, "Preacher/prophet"], [83, "Historian"], [88, "Archivist"], [90, "Caretaker/curator"], [92, "Guide/attendant"], [94, "Gardener"], [96, "Scholar"], [98, "Restorationist"], [100, "High priest"]],
  ],
  "Academic": [
    [[15, "University/college"], [30, "Lecture hall"], [45, "Library"], [55, "Dormitory"], [65, "Cafeteria"], [71, "Research lab"], [77, "Admin office"], [83, "Store/shop/mall"], [88, "Auditorium"], [90, "Sports field"], [92, "Faculty office"], [94, "Computer lab"], [96, "Science center"], [98, "Observatory"], [100, "Common/park"]],
    [[15, "Student"], [30, "Service worker"], [45, "Clerk/salesperson"], [55, "Administrator"], [65, "Professor"], [71, "Researcher"], [77, "Librarian/archivist"], [83, "Security/police"], [88, "Custodian"], [90, "Coach/trainer"], [92, "Lab/IT tech"], [94, "Guide"], [96, "Visiting scholar"], [98, "Counselor"], [100, "Head of school"]],
  ],
  "Science/Medical": [
    [[15, "Clinic"], [30, "Hospital"], [45, "Pharmacy"], [55, "Outpatient facility"], [65, "Med school"], [71, "Research lab"], [77, "Biotech facility"], [83, "Medical supply"], [88, "Genetics lab"], [90, "Emergency facility"], [92, "Science university"], [94, "Quarantine ward"], [96, "Data center"], [98, "R&D lab"], [100, "ACADEMIC"]],
    [[15, "Patient"], [30, "Nurse"], [45, "Doctor"], [55, "Researcher"], [65, "Lab tech"], [71, "Health tech"], [77, "Pharmacist"], [83, "Administrator"], [88, "Custodian"], [90, "Therapist"], [92, "Security/police"], [94, "Paramedic/ER"], [96, "Surgeon/specialist"], [98, "Scientist"], [100, "ACADEMIC"]],
  ],
  "Municipal": [
    [[15, "Public library"], [30, "Municipal park"], [45, "Assembly plaza"], [55, "Post office"], [65, "City/district hall"], [71, "Courthouse"], [77, "Police station"], [83, "Fire station"], [88, "Public works"], [90, "Utility offices"], [92, "Waste facility"], [94, "Transit offices"], [96, "Civic auditorium"], [98, "Water treatment"], [100, "Emergency center"]],
    [[15, "Civil servant"], [30, "Clerk"], [45, "Librarian"], [55, "Security/police"], [65, "Social worker"], [71, "Administrator"], [77, "Postal worker"], [83, "Utility worker"], [88, "Firefighter/EMS"], [90, "Sanitation worker"], [92, "Engineer"], [94, "Lawyer/defender"], [96, "Council member"], [98, "Judge"], [100, "Leader/mayor"]],
  ],
};

// Facility details and props, TPV p. 149.
export const facilityObjects = [
  [3, "Activity blip", "Access terminal"],
  [6, "Blinking warning lights", "Atmosphere scanner"],
  [9, "Broken PROP", "Communication beacon"],
  [12, "Broken furniture", "Console/tablet"],
  [15, "Cold/warm draft", "Containment unit"],
  [18, "Damaged floor", "Dispenser/vendor"],
  [21, "Dismantled PROP", "Documents/data"],
  [24, "Dried stains", "Droid/robot"],
  [27, "Faded labels/signage", "Explosive charge"],
  [30, "Faint buzzing/music", "Fire suppression system"],
  [33, "Flickering lights", "Hidden access port"],
  [36, "Fuel/fluid leak", "Hologram projector"],
  [39, "Half-built structure", "Holomap"],
  [42, "Ice crystals", "Industrial robot arm"],
  [45, "Inoperative drones", "Keycard/access code"],
  [48, "Loose cables", "Laboratory samples"],
  [51, "Low oxygen levels", "Liquid nitrogen canister"],
  [54, "Misaligned machinery", "Lockers/safe/vault"],
  [57, "Missing components", "Medkit/defibrillator"],
  [60, "Muffled conversation", "Oxygen tank"],
  [63, "Open hatch/door", "Pistol/rifle/blaster"],
  [66, "Power fluctuations", "Plasma cutter"],
  [69, "Residual energy field", "Portable generator"],
  [72, "Rusted pipes", "Power cell"],
  [75, "Scattered documents", "Repair kit"],
  [78, "Scorched walls/floor", "Safety/hazmat gear"],
  [81, "Smashed equipment", "Scanner/motion tracker"],
  [84, "Sound/echo", "Security/surveillance drone"],
  [87, "Static hum", "Stun baton"],
  [90, "Strange symbols", "Surveillance camera"],
  [93, "Tremor/vibration", "Surveillance footage"],
  [96, "Unmarked container", "Welding tool"],
];

// Village basic location and inhabitant tables, TPV p. 110.
export const villageBasic = [
  [[12, "Homes/dwellings"], [14, "Storage structure"], [16, "Water source"], [18, "Energy source"], [20, "Farmland/gardens"], [22, "Animal pens"], [24, "Granary/storehouse"], [29, "Workshop/smithy"], [39, "Gathering area"], [54, "Marketplace/trading post"], [59, "Meeting/council hall"], [61, "School/training center"], [63, "Healer’s hut/clinic"], [65, "Craftsperson’s hut/shop"], [72, "Graveyard/memorial"], [74, "Lookout/watchtower"], [76, "Barracks/guardhouse"], [78, "Communication center"], [80, "Leader’s residence"]],
  [[2, "Outsider/traveler"], [7, "Child/youth"], [19, "Farmer/food producer"], [31, "Laborer/worker"], [36, "Animal tender/herder"], [46, "Hunter/fisher"], [48, "Cook/food preparer"], [50, "Builder/mechanic"], [52, "Publican/host"], [57, "Craftsperson/artisan"], [59, "Storyteller/historian"], [61, "Artist/musician"], [66, "Trader/merchant"], [68, "Teacher/educator"], [72, "Healer/medic"], [74, "Religious leader/priest"], [76, "Messenger/scout"], [78, "Guard/warrior"], [80, "Leader/chief"]],
];
