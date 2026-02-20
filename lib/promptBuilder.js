// Advanced Prompt Builder for Infinite Entourage
// Handles subject detection, diversity injection, and style adaptation

// Subject type detection patterns
const SUBJECT_PATTERNS = {
  person: {
    keywords: [
      'person', 'people', 'human', 'humans', 'individual', 'individuals', 'figure', 'figures',
      'man', 'men', 'woman', 'women', 'male', 'female', 'guy', 'guys', 'lady', 'ladies',
      'gentleman', 'gentlemen', 'gentlewoman', 'businessman', 'businessmen', 'businesswoman', 'businesswomen',
      'child', 'children', 'kid', 'kids', 'boy', 'boys', 'girl', 'girls', 'teen', 'teens',
      'teenager', 'teenagers', 'adolescent', 'youth', 'youngster', 'toddler', 'toddlers',
      'adult', 'adults', 'grown-up', 'parent', 'parents', 'mother', 'father', 'mom', 'dad',
      'grandmother', 'grandfather', 'grandma', 'grandpa', 'grandparent', 'baby', 'infant',
      'pedestrian', 'pedestrians', 'bystander', 'onlooker', 'passerby', 'commuter',
      'crowd', 'crowds', 'group', 'groups', 'family', 'families', 'couple', 'couples',
            'elderly', 'senior', 'seniors', 'old', 'older', 'young', 'younger', 'middle-aged',
      'walking', 'standing', 'running', 'jogging', 'strolling', 'wandering', // Note: removed 'sitting' - animals sit too!
      'professional', 'worker', 'employee', 'colleague', 'student', 'teacher', 'doctor',
      'nurse', 'police', 'officer', 'firefighter', 'chef', 'waiter', 'waitress',
      'construction worker', 'office worker', 'business person'
    ],
    framing: 'full body person from head to toe, complete figure visible, natural candid pose'
  },
  
  animal: {
    keywords: [
      'dog', 'dogs', 'puppy', 'puppies', 'pup', 'canine', 'retriever', 'shepherd', 'terrier', 'poodle',
      'labrador', 'beagle', 'bulldog', 'husky', 'malamute', 'collie', 'greyhound', 'dachshund',
      'rottweiler', 'doberman', 'boxer', 'pug', 'chihuahua', 'shiba', 'corgi', 'dalmatian',
      'cat', 'cats', 'kitten', 'kittens', 'kitty', 'feline', 'tabby', 'calico', 'siamese',
      'persian', 'maine coon', 'ragdoll', 'sphynx', 'bengal', 'bird', 'birds', 'avian',
      'animal', 'animals', 'pet', 'pets', 'horse', 'horses', 'pony', 'mare', 'stallion',
      'cow', 'cows', 'cattle', 'bull', 'ox', 'sheep', 'goat', 'goats', 'baby goat', 'chicken',
      'hen', 'rooster', 'chick', 'duck', 'ducks', 'duckling', 'goose', 'geese', 'gosling',
      'pig', 'pigs', 'hog', 'swine', 'piglet', 'boar', 'rabbit', 'rabbits', 'bunny', 'bunnies',
      'deer', 'fawn', 'buck', 'doe', 'stag', 'elephant', 'lion', 'lions', 'lioness', 'tiger',
      'tigers', 'bear', 'bears', 'wolf', 'wolves', 'fox', 'foxes', 'squirrel', 'chipmunk',
      'mouse', 'mice', 'rat', 'rats', 'hamster', 'gerbil', 'guinea pig', 'chinchilla',
      'parrot', 'parakeet', 'cockatiel', 'macaw', 'parrotlet', 'pigeon', 'pigeons', 'dove',
      'doves', 'seagull', 'seagulls', 'gull', 'eagle', 'eagles', 'hawk', 'hawks', 'falcon',
      'owl', 'owls', 'butterfly', 'butterflies', 'moth', 'bee', 'bees', 'wasp', 'hornet',
      'insect', 'insects', 'bug', 'bugs', 'spider', 'spiders', 'tarantula', 'scorpion',
      'fish', 'fishes', 'shark', 'sharks', 'dolphin', 'dolphins', 'whale', 'whales',
      'turtle', 'turtles', 'tortoise', 'snake', 'snakes', 'python', 'cobra', 'viper',
      'lizard', 'lizards', 'iguana', 'gecko', 'chameleon', 'frog', 'frogs', 'toad', 'toads',
      // Fantasy/creature types
      'alien', 'aliens', 'creature', 'creatures', 'monster', 'monsters', 'dragon', 'dragons',
      'unicorn', 'unicorns', 'robot', 'robots', 'cyborg', 'mutant', 'beast', 'beasts'
    ],
    framing: 'complete creature fully visible, entire being in frame, natural pose'
  },
  
  vehicle: {
    keywords: [
      'car', 'truck', 'vehicle', 'automobile', 'van', 'suv', 'sedan', 'hatchback',
      'convertible', 'coupe', 'wagon', 'minivan', 'pickup', 'bus', 'motorcycle',
      'scooter', 'bicycle', 'bike', 'train', 'locomotive', 'airplane', 'plane',
      'helicopter', 'boat', 'ship', 'yacht', 'sailboat', 'canoe', 'kayak', 'jet ski',
      'tractor', 'bulldozer', 'crane', 'forklift', 'ambulance', 'fire truck', 'police car',
      'taxi', 'limo', 'cart', 'wagon', 'carriage', 'wheelchair', 'stroller', 'skateboard'
    ],
    framing: 'complete vehicle, full object visible, all wheels/parts in frame'
  },
  
  plant: {
    keywords: [
      'tree', 'plant', 'flower', 'bush', 'shrub', 'palm', 'fern', 'succulent',
      'cactus', 'rose', 'tulip', 'daisy', 'sunflower', 'lily', 'orchid', 'bamboo',
      'pine', 'oak', 'maple', 'birch', 'willow', 'palm tree', 'ficus', 'monstera',
      'ivy', 'vine', 'grass', 'hedge', 'topiary', 'bonsai', 'potted plant',
      'apple tree', 'cherry tree', 'lemon tree', 'fruit tree', 'evergreen', 'deciduous'
    ],
    framing: 'complete plant specimen, full form visible, natural growth pattern',
    // Special handling for trees
    treeKeywords: ['tree', 'pine', 'oak', 'maple', 'birch', 'willow', 'palm', 'apple tree', 'cherry tree', 'lemon tree', 'fruit tree', 'evergreen', 'deciduous', 'branch', 'branches', 'leaf', 'leaves', 'foliage', 'canopy'],
    treeFraming: 'full tree with visible trunk and complete branching structure, entire tree from base to top, detailed bark texture, complete canopy with all branches and foliage as described',
    // Special handling for ferns
    fernKeywords: ['fern', 'ferns', 'frond', 'fronds', 'maidenhair', 'bracken', 'pteridophyte'],
    fernFraming: 'full fern plant with multiple fronds, lush green foliage, unfurling fronds visible, complete cluster of fern leaves, dense feathery leaves, healthy vibrant green fern'
  },
  
  object: {
    keywords: [
      'object', 'item', 'thing', 'furniture', 'chair', 'table', 'desk', 'sofa', 'couch',
      'lamp', 'light', 'fixture', 'appliance', 'machine', 'equipment', 'tool', 'instrument',
      'device', 'gadget', 'electronics', 'computer', 'laptop', 'phone', 'tablet', 'monitor',
      'tv', 'television', 'speaker', 'camera', 'lens', 'tripod', 'drone', 'umbrella',
      'backpack', 'bag', 'suitcase', 'luggage', 'box', 'container', 'crate', 'barrel',
      'basket', 'bin', 'bucket', 'cage', 'fence', 'gate', 'sign', 'pole', 'post',
      'bench', 'trash can', 'fire hydrant', 'mailbox', 'newspaper box', 'parking meter',
      'street light', 'traffic light', 'stop sign', 'billboard', 'awning', 'canopy',
      'tent', 'canopy', 'umbrella', 'flag', 'banner', 'poster', 'signage'
    ],
    framing: 'complete object, full item visible, all components in frame'
  }
};

// Diversity attributes for people when not specified
const DIVERSITY = {
  race: [
    'East Asian', 'South Asian', 'Black', 'White', 'Hispanic', 'Latino', 'Latina',
    'Middle Eastern', 'Native American', 'Indigenous', 'Pacific Islander',
    'African', 'European', 'Mediterranean', 'Scandinavian', 'Celtic',
    'mixed race', 'multiracial'
  ],
  
  gender: [
    'man', 'woman', 'person'
  ],
  
  age: [
    'young adult', 'adult', 'middle-aged', 'elderly', 'senior', 'teenager',
    'child', 'young professional', 'retired'
  ],
  
  bodyType: [
    'average build', 'athletic build', 'slender', 'curvy', 'heavyset',
    'tall', 'short', 'petite', 'plus-size'
  ],
  
  style: [
    'casual clothing', 'business casual', 'professional attire', 'streetwear',
    'bohemian style', 'preppy', 'athletic wear', 'vintage clothing',
    'modern fashion', 'classic style', 'minimalist clothing'
  ]
};

// Style modifiers for different rendering modes
const STYLE_MODIFIERS = {
  realistic: {
    person: 'photorealistic, authentic skin texture, crisp detail, sharp focus, professional studio lighting, ultra detailed, high resolution, lifelike',
    animal: 'photorealistic, detailed fur/feathers, crisp detail, sharp focus, professional lighting, wildlife photography style, ultra detailed',
    vehicle: 'photorealistic, automotive photography, detailed reflections, crisp detail, sharp focus, studio lighting, ultra detailed',
    plant: 'photorealistic, botanical photography, detailed textures, crisp detail, sharp focus, natural lighting, ultra detailed',
    object: 'photorealistic, product photography, detailed materials, crisp detail, sharp focus, studio lighting, ultra detailed',
    default: 'photorealistic, detailed texture, crisp detail, sharp focus, professional lighting, ultra detailed'
  },
  
  illustration: {
    person: 'flat vector architectural entourage illustration, solid color blocks, no gradients, muted pastel color palette, minimal detail, no facial features, clean crisp edges, full body figure, contemporary clothing, diverse representation, cutout people style, 2D flat illustration',
    animal: 'flat vector illustration, solid color shapes, minimal detail, no gradients, clean edges, architectural entourage style, 2D flat style',
    vehicle: 'flat vector architectural entourage illustration, solid color blocks, no gradients, minimal detail, clean crisp edges, isometric or side view, muted colors, 2D flat illustration, not photorealistic',
    plant: 'flat vector botanical illustration, solid color shapes, minimal detail, no gradients, clean edges, architectural entourage style',
    object: 'flat vector product illustration, solid color blocks, minimal detail, clean edges, architectural entourage style, muted pastel colors',
    default: 'flat vector architectural illustration, solid color blocks, minimal detail, no gradients, muted pastel palette, clean crisp edges, 2D flat style'
  },
  
  silhouette: {
    all: 'pure black silhouette, vector graphic style, razor sharp edges, absolutely no gradients, no blur, no texture, no interior details, no shading, flat solid black fill, high contrast against white, clean cutout shape, no background elements, no extra objects'
  }
};

// Safety prompts for different subjects
const SAFETY_PROMPTS = {
  person: 'wearing complete everyday outfit, fully clothed, appropriate attire, modest clothing',
  vehicle: 'empty vehicle, no driver, no passengers, no people inside or around',
  default: ''
};

// Universal context for all entourage - specific white background to help rembg, with shadow reduction
const CONTEXT_PROMPT = 'isolated subject on solid pure white background, high key lighting, minimal shadows, centered in frame, sharp focus';

// Function to detect subject type
function detectSubjectType(prompt) {
  const promptLower = prompt.toLowerCase();
  const words = promptLower.split(/\s+/);
  const scores = {};
  
  for (const [type, config] of Object.entries(SUBJECT_PATTERNS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Check for exact word match (as whole word)
      const wordMatch = words.some(word => word === keywordLower || 
        word.replace(/[^a-z]/g, '') === keywordLower);
      
      // Check for substring match
      const substringMatch = promptLower.includes(keywordLower);
      
      if (wordMatch) {
        score += 3; // Strong weight for exact word match
      } else if (substringMatch) {
        score += 1; // Lower weight for substring
      }
      
      // Boost score for matches at start of prompt
      if (promptLower.startsWith(keywordLower)) {
        score += 2;
      }
    }
    scores[type] = score;
  }
  
  // Find highest scoring type
  let bestType = 'object'; // default
  let bestScore = 0;
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }
  
  // Tie-breaking: prefer person > animal > vehicle > plant > object
  const typePriority = ['person', 'animal', 'vehicle', 'plant', 'object'];
  const candidates = Object.entries(scores)
    .filter(([type, score]) => score === bestScore && score > 0)
    .map(([type]) => type);
  
  if (candidates.length > 1) {
    for (const priority of typePriority) {
      if (candidates.includes(priority)) {
        return priority;
      }
    }
  }
  
  return bestScore > 0 ? bestType : 'object';
}

// Function to check if diversity attributes are already specified
function hasSpecifiedDiversity(prompt) {
  const promptLower = prompt.toLowerCase();
  const words = promptLower.split(/\s+/);
  
  // Check for race/ethnicity mentions (exact word match)
  const raceKeywords = [...DIVERSITY.race, 'asian', 'black', 'white', 'hispanic', 'latino', 'african', 'european', 
    'caucasian', 'african-american', 'afro', 'latina', 'indian', 'chinese', 'japanese', 'korean'];
  const hasRace = raceKeywords.some(r => {
    const rLower = r.toLowerCase();
    return words.some(word => word === rLower || word.includes(rLower));
  });
  
  // Check for gender mentions (exact word match OR word contains gender)
  const genderKeywords = ['man', 'woman', 'male', 'female', 'boy', 'girl', 'guy', 'lady', 'gentleman', 'gentlewoman', 'men', 'women', 'child', 'kid', 'kids', 'baby', 'toddler', 'infant'];
  const hasGender = genderKeywords.some(g => {
    const gLower = g.toLowerCase();
    return words.some(word => {
      const wordClean = word.replace(/[^a-z]/g, '');
      return wordClean === gLower || wordClean.includes(gLower);
    });
  });
  
  // Check for age mentions
  const ageKeywords = ['young', 'old', 'elderly', 'senior', 'teen', 'teenage', 'teenager', 'child', 'kid', 'kids', 'adult', 'middle-aged', 'middle aged', 'toddler', 'baby', 'infant', 'children'];
  const hasAge = ageKeywords.some(a => {
    const aLower = a.toLowerCase();
    return words.some(word => word.includes(aLower));
  });
  
  // Check if specific youth terms that imply gender-neutral child (used to add "young" reinforcement)
  const youthTerms = ['kid', 'kids', 'child', 'children', 'toddler', 'baby', 'infant'];
  const hasYouthTerm = youthTerms.some(y => {
    const yLower = y.toLowerCase();
    return words.some(word => word === yLower || word.includes(yLower));
  });
  
  // Check for multiple people - skip diversity if ambiguous
  const multiPersonTerms = ['two', 'couple', 'group', 'crowd', 'people', 'pair', 'friends', 'family'];
  const hasMultiplePeople = multiPersonTerms.some(m => {
    const mLower = m.toLowerCase();
    return words.some(word => word === mLower || word.includes(mLower));
  });
  
  return { hasRace, hasGender, hasAge, hasYouthTerm, hasMultiplePeople };
}

// Function to inject diversity into person prompts
function injectDiversity(prompt) {
  const diversity = hasSpecifiedDiversity(prompt);
  const additions = [];
  
  // Skip diversity injection for multiple people - too ambiguous
  if (diversity.hasMultiplePeople) {
    return additions;
  }
  
  if (!diversity.hasRace) {
    const randomRace = DIVERSITY.race[Math.floor(Math.random() * DIVERSITY.race.length)];
    additions.push(randomRace);
  }
  
  if (!diversity.hasGender) {
    const randomGender = DIVERSITY.gender[Math.floor(Math.random() * DIVERSITY.gender.length)];
    additions.push(randomGender);
  }
  
  if (!diversity.hasAge) {
    const randomAge = DIVERSITY.age[Math.floor(Math.random() * DIVERSITY.age.length)];
    additions.push(randomAge);
  }
  
  // Add "young" reinforcement if kid/child detected (to ensure FLUX generates child not adult)
  if (diversity.hasYouthTerm && !additions.some(a => a.includes('young') || a.includes('child') || a.includes('kid'))) {
    additions.unshift('young');
  }
  
  // Randomly add body type (30% chance)
  if (Math.random() < 0.3) {
    const randomBody = DIVERSITY.bodyType[Math.floor(Math.random() * DIVERSITY.bodyType.length)];
    additions.push(randomBody);
  }
  
  // Randomly add style (50% chance)
  if (Math.random() < 0.5) {
    const randomStyle = DIVERSITY.style[Math.floor(Math.random() * DIVERSITY.style.length)];
    additions.push(randomStyle);
  }
  
  return additions;
}

// Main prompt builder function
function buildEntouragePrompt(userPrompt, style = 'realistic') {
  const subjectType = detectSubjectType(userPrompt);
  let framing = SUBJECT_PATTERNS[subjectType]?.framing || SUBJECT_PATTERNS.object.framing;
  
  // Special handling for trees and ferns - use stronger framing
  if (subjectType === 'plant') {
    const promptLower = userPrompt.toLowerCase();
    const isTree = SUBJECT_PATTERNS.plant.treeKeywords.some(kw => promptLower.includes(kw.toLowerCase()));
    if (isTree) {
      framing = SUBJECT_PATTERNS.plant.treeFraming;
    }
    const isFern = SUBJECT_PATTERNS.plant.fernKeywords.some(kw => promptLower.includes(kw.toLowerCase()));
    if (isFern) {
      framing = SUBJECT_PATTERNS.plant.fernFraming;
    }
  }
  
  // Start with user prompt as base
  let enhancedPrompt = userPrompt;
  
  // Inject diversity for people when not specified
  if (subjectType === 'person') {
    const diversityAdditions = injectDiversity(userPrompt);
    if (diversityAdditions.length > 0) {
      enhancedPrompt = `${diversityAdditions.join(', ')}, ${userPrompt}`;
    }
  }
  
  // Detect surfaces/props the subject is on (towel, chair, bench, etc.)
  const surfaceMatch = userPrompt.toLowerCase().match(/(?:laying?|sitting|standing|on)\s+(?:on\s+)?(?:a\s+)?(\w+(?:\s+\w+)?)/);
  const excludedSurfaces = ['background', 'street', 'sidewalk', 'floor', 'ground', 'pavement', 'road', 'grass'];
  const surfacePrompt = surfaceMatch && !excludedSurfaces.includes(surfaceMatch[1]) 
    ? `, including the ${surfaceMatch[1]} they are on, subject plus all visible items` 
    : '';
  
  // Get style modifier
  let styleModifier;
  if (style === 'silhouette') {
    styleModifier = STYLE_MODIFIERS.silhouette.all;
  } else {
    styleModifier = STYLE_MODIFIERS[style]?.[subjectType] || STYLE_MODIFIERS[style]?.default || STYLE_MODIFIERS.realistic.default;
  }
  
  // Get safety prompt if applicable
  const safetyPrompt = SAFETY_PROMPTS[subjectType] || SAFETY_PROMPTS.default;
  
  // Build final prompt: framing + enhanced user prompt + surface items + style + safety + context
  let fullPrompt = `${framing}, ${enhancedPrompt}${surfacePrompt}, ${styleModifier}`;
  
  if (safetyPrompt) {
    fullPrompt += `, ${safetyPrompt}`;
  }
  
  fullPrompt += `, ${CONTEXT_PROMPT}`;
  
  return {
    prompt: fullPrompt,
    subjectType,
    style,
    diversityInjected: subjectType === 'person' && enhancedPrompt !== userPrompt
  };
}

// Export for use in API
module.exports = {
  buildEntouragePrompt,
  detectSubjectType,
  injectDiversity,
  hasSpecifiedDiversity,
  DIVERSITY,
  SUBJECT_PATTERNS
};
