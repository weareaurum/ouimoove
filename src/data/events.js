export const DEFAULT_EVENTS = [
  {
    id: 'e1',
    title: 'Festival Afrobeats Lomé 2025',
    category: 'Musique',
    date: '2025-08-15',
    time: '19:00',
    location: 'Stade de Kégué',
    city: 'Lomé',
    desc: "Le plus grand festival de musique afrobeats en Afrique de l'Ouest.",
    emoji: '🎵',
    tickets: [
      { id: 'dt1', name: 'Tribune',  price: 5000,  total: 500, sold: 120 },
      { id: 'dt2', name: 'Pelouse',  price: 10000, total: 300, sold: 80  },
      { id: 'dt3', name: 'VIP',      price: 25000, total: 50,  sold: 12  },
    ],
    organizer: 'system',
  },
  {
    id: 'e2',
    title: 'TEDx Lomé — Innovation Africa',
    category: 'Tech',
    date: '2025-09-10',
    time: '09:00',
    location: 'Centre Culturel Français',
    city: 'Lomé',
    desc: "Conférences inspirantes sur l'innovation et l'entrepreneuriat en Afrique.",
    emoji: '💡',
    tickets: [
      { id: 'dt4', name: 'Standard', price: 8000,  total: 200, sold: 45 },
      { id: 'dt5', name: 'Premium',  price: 20000, total: 30,  sold: 8  },
    ],
    organizer: 'system',
  },
  {
    id: 'e3',
    title: 'Finale CHAN 2025 — Togo vs Ghana',
    category: 'Sport',
    date: '2025-10-05',
    time: '16:00',
    location: 'Stade Gnassingbé Eyadéma',
    city: 'Lomé',
    desc: 'Vivez la finale en direct ! 40 000 supporters.',
    emoji: '⚽',
    tickets: [
      { id: 'dt6', name: 'Tribune Nord', price: 3000,  total: 5000, sold: 2000 },
      { id: 'dt7', name: 'VIP Loge',     price: 50000, total: 100,  sold: 45   },
    ],
    organizer: 'system',
  },
  {
    id: 'e4',
    title: 'Nuit Gastronomique — Saveurs du Togo',
    category: 'Gastronomie',
    date: '2025-11-20',
    time: '18:00',
    location: 'Hôtel Sarakawa',
    city: 'Lomé',
    desc: 'Dégustation des meilleures recettes togolaises par des chefs étoilés.',
    emoji: '🍽️',
    tickets: [
      { id: 'dt8', name: 'Entrée soirée', price: 15000, total: 150, sold: 60 },
    ],
    organizer: 'system',
  },
]

export const CATEGORIES = ['Musique', 'Festival', 'Sport', 'Tech', 'Culturel', 'Gastronomie']
export const CITIES     = ['Lomé', 'Cotonou', 'Ouidah', 'Accra', 'Abidjan', 'Dakar', 'Lagos']

export const CATEGORY_EMOJI = {
  Musique: '🎵', Festival: '🎪', Sport: '⚽',
  Tech: '💻', Culturel: '🎭', Gastronomie: '🍽️',
}
