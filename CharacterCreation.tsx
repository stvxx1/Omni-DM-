import React, { useState, useEffect } from 'react';
import { generateArtwork } from '../services/geminiService';
import { Loader2 } from 'lucide-react';

const FANTASY_RACES = [
  { name: 'Human', bonuses: { str: 1, agi: 1, con: 1, int: 1, cha: 1 }, description: 'Adaptable and ambitious, humans thrive in the blood-sands through sheer versatility and stubbornness.', exampleBuild: 'The Jack-of-all-trades Mercenary', racialSkill: { name: 'Indomitable Will', description: 'Once per long rest, ignore a fatal blow and survive at 1 HP.' } },
  { name: 'Elf', bonuses: { str: -1, agi: 3, con: -1, int: 2, cha: 2 }, description: 'Ancient and graceful, their connection to the fading magic makes them deadly but physically frail.', exampleBuild: 'The Silent Woods-Sniper', racialSkill: { name: 'Fey-Step', description: 'Short-range teleportation through shadows or natural environments.' } },
  { name: 'Dwarf', bonuses: { str: 2, agi: -1, con: 3, int: 0, cha: 1 }, description: 'Forged in the deep earth, dwarves are unyielding frontliners who can take a beating and give one back.', exampleBuild: 'The Ironclad Frontliner', racialSkill: { name: 'Stone-Skin', description: 'Natural immunity to bleeding and resistance to poison effects.' } },
  { name: 'Orc', bonuses: { str: 4, agi: 0, con: 2, int: -3, cha: -3 }, description: 'Brutal and uncompromising, orcs rely on raw physical power to crush their enemies.', exampleBuild: 'The Blood-Raged Berserker', racialSkill: { name: 'Blood-Rage', description: 'Melee damage increases significantly as your health decreases.' } },
  { name: 'Goblin', bonuses: { str: -2, agi: 4, con: 0, int: 2, cha: -2 }, description: 'Nimble and cunning, goblins survive by striking from the shadows and outsmarting larger foes.', exampleBuild: 'The Shadows-Dwelling Thief', racialSkill: { name: 'Scavenger\'s Luck', description: 'Finds extra loot/resources, and can squeeze into tiny spaces to escape or infiltrate.' } },
  { name: 'Tiefling', bonuses: { str: 0, agi: 1, con: 0, int: 2, cha: 3 }, description: 'Cursed with infernal blood, they use their natural charisma and dark magic to manipulate others.', exampleBuild: 'The Silver-Tongued Warlock', racialSkill: { name: 'Hellfire Blood', description: 'Melee attackers take fire damage, and you are highly resistant to heat/fire.' } },
  { name: 'Dragonborn', bonuses: { str: 3, agi: 0, con: 2, int: 0, cha: 1 }, description: 'Proud and resilient, they carry the blood of ancient drakes, making them natural warriors.', exampleBuild: 'The Scale-Armored Paladin', racialSkill: { name: 'Draconic Breath', description: 'Unleash an AoE elemental breath weapon (fire, acid, or lightning).' } },
  { name: 'Undead', bonuses: { str: 1, agi: -1, con: 4, int: 1, cha: -4 }, description: 'Reanimated corpses driven by dark purpose. They feel no pain, but their rotting flesh repels the living.', exampleBuild: 'The Unstoppable Death-Knight', racialSkill: { name: 'Grave-Cold', description: 'Does not need to breathe, eat, or sleep. Immune to fear and mind-control.' } },
];

const FANTASY_CLASSES = [
  { name: 'Warrior', description: 'Masters of arms and armor, relying on physical prowess to dominate the battlefield.', exampleBuild: 'Heavy Armor + Greatsword', skillTree: [
    { name: 'Cleave', description: 'Strike multiple adjacent enemies with a single heavy blow.' },
    { name: 'Shield Wall', description: 'Enter a defensive stance, drastically reducing incoming physical damage.' },
    { name: 'Armor Piercing', description: 'Target weak points to bypass enemy armor.' }
  ]},
  { name: 'Rogue', description: 'Experts in stealth, precision strikes, and dirty fighting. They exploit every weakness.', exampleBuild: 'Dual Daggers + Poison', skillTree: [
    { name: 'Backstab', description: 'Deal massive critical damage when attacking from stealth or behind.' },
    { name: 'Shadow-Meld', description: 'Blend into darkness, becoming nearly invisible.' },
    { name: 'Poison Crafting', description: 'Apply debilitating toxins to weapons.' }
  ]},
  { name: 'Mage', description: 'Wielders of volatile, corrupting magic. They sacrifice safety for devastating arcane power.', exampleBuild: 'Fireball + Teleportation', skillTree: [
    { name: 'Arcane Missile', description: 'Launch unerring bolts of raw magical energy.' },
    { name: 'Mana Shield', description: 'Absorb incoming damage using your mana pool instead of health.' },
    { name: 'Reality Tear', description: 'Briefly distort space to teleport short distances or redirect attacks.' }
  ]},
  { name: 'Cleric', description: 'Zealots who channel the power of cruel gods to heal allies and smite heretics.', exampleBuild: 'Mace + Healing Aura', skillTree: [
    { name: 'Divine Smite', description: 'Infuse your weapon with holy power for extra damage.' },
    { name: 'Aura of Mending', description: 'Slowly heal yourself and nearby allies over time.' },
    { name: 'Turn Undead', description: 'Force undead and demonic entities to flee in terror.' }
  ]},
  { name: 'Ranger', description: 'Survivalists and trackers who excel in ranged combat and navigating the harsh wilderness.', exampleBuild: 'Longbow + Animal Companion', skillTree: [
    { name: 'Hunter\'s Mark', description: 'Designate a target to deal extra damage and track them anywhere.' },
    { name: 'Volley', description: 'Fire a rapid barrage of arrows at a target area.' },
    { name: 'Beast Taming', description: 'Command a wild beast to fight alongside you.' }
  ]},
  { name: 'Paladin', description: 'Holy warriors bound by strict oaths, combining martial skill with divine protection.', exampleBuild: 'Sword & Board + Smite', skillTree: [
    { name: 'Lay on Hands', description: 'Transfer your own life force to heal an ally.' },
    { name: 'Righteous Vengeance', description: 'Reflect a portion of damage taken back to the attacker.' },
    { name: 'Unstoppable Charge', description: 'Rush forward, knocking down enemies in your path.' }
  ]},
  { name: 'Warlock', description: 'Bargainers who draw power from eldritch entities, specializing in curses and mind control.', exampleBuild: 'Eldritch Blast + Mind Control', skillTree: [
    { name: 'Eldritch Blast', description: 'Fire a beam of crackling dark energy.' },
    { name: 'Soul Siphon', description: 'Drain health from an enemy to heal yourself.' },
    { name: 'Mind Flay', description: 'Assault an enemy\'s mind, causing confusion and psychic damage.' }
  ]},
  { name: 'Berserker', description: 'Frenzied fighters who channel their rage into unstoppable, reckless assaults.', exampleBuild: 'Dual Axes + Frenzy', skillTree: [
    { name: 'Frenzy', description: 'Enter a rage, increasing attack speed and damage but lowering defense.' },
    { name: 'Bloodthirst', description: 'Heal a small amount of health with every successful melee strike.' },
    { name: 'Intimidating Roar', description: 'Terrify nearby enemies, reducing their attack power.' }
  ]}
];

const CYBERPUNK_ORIGINS = [
  { name: 'Street Rat', bonuses: { str: 0, agi: 3, con: 2, int: 0, cha: 0 }, description: 'A scrappy survivor born in the gutter. You thrive on low-tier drugs and sheer desperation.', exampleBuild: 'The Gutter-Punk Scavenger', racialSkill: { name: 'Gutter-Sense', description: 'Advantage on detecting ambushes, traps, and finding illicit goods.' } },
  { name: 'Corpo Exile', bonuses: { str: 0, agi: 0, con: 0, int: 4, cha: 2 }, description: 'A fallen elite. You lost your corner office, but you kept the backdoor access codes and the ruthless mindset.', exampleBuild: 'The Disgraced Executive Hacker', racialSkill: { name: 'Golden Parachute', description: 'Starts with hidden offshore funds and high-level corporate access codes.' } },
  { name: 'Chrome-Head', bonuses: { str: 5, agi: 0, con: 0, int: 0, cha: -4 }, description: 'Addicted to cybernetics. You traded your humanity and charisma for subdermal armor and hydraulic strength.', exampleBuild: 'The Full-Borg Enforcer', racialSkill: { name: 'Overclock', description: 'Push cybernetics beyond safe limits for a massive stat boost, taking damage afterward.' } },
  { name: 'Nomad', bonuses: { str: 2, agi: 0, con: 3, int: 0, cha: 0 }, description: 'A wasteland wanderer. You know vehicles, survival, and how to take a bullet better than city-dwellers.', exampleBuild: 'The Highway Raider', racialSkill: { name: 'Wasteland Jury-Rig', description: 'Can repair or hotwire almost any mechanical device with scrap.' } },
  { name: 'Med-Tech Dropout', bonuses: { str: 0, agi: 2, con: 0, int: 3, cha: 0 }, description: 'An underground doctor. You know exactly where to cut to heal—or to harvest.', exampleBuild: 'The Black-Market Ripper', racialSkill: { name: 'Anatomical Insight', description: 'Critical hits deal extra damage, and healing items are twice as effective.' } },
  { name: 'Doll-House Escapee', bonuses: { str: 0, agi: 2, con: 0, int: 0, cha: 4 }, description: 'A charismatic survivor of the pleasure dens. Your pheromone overdrive makes you a master manipulator.', exampleBuild: 'The Seductive Infiltrator', racialSkill: { name: 'Empathic Echo', description: 'Can read surface emotions and perfectly mimic voices/mannerisms.' } },
  { name: 'Net-Ghost', bonuses: { str: 0, agi: 0, con: -3, int: 5, cha: 0 }, description: 'A digital entity trapped in a frail meat-sack. Your physical body is weak, but your mind is a weapon.', exampleBuild: 'The Deep-Web Architect', racialSkill: { name: 'Ghost in the Machine', description: 'Can briefly possess drones or low-security cybernetics.' } },
  { name: 'Urban Predator', bonuses: { str: 3, agi: 3, con: 0, int: 0, cha: 0 }, description: 'An apex hunter of the neon streets. You rely on blood-sense and raw instinct to track your prey.', exampleBuild: 'The Neon-Stalker Assassin', racialSkill: { name: 'Apex Stalker', description: 'Completely silent movement in urban environments, plus thermal vision.' } },
];

const CYBERPUNK_CLASSES = [
  { name: 'Solo', description: 'The professional killer. You rely on high-end reflexes and raw firepower to get the job done.', exampleBuild: 'Sandevistan + Katana', skillTree: [
    { name: 'Bullet Time', description: 'Temporarily slow down perception of time to dodge attacks or line up shots.' },
    { name: 'Quick Draw', description: 'Instantly swap weapons and fire with perfect accuracy.' },
    { name: 'Executioner', description: 'Deal massive damage to enemies below 30% health.' }
  ]},
  { name: 'Netrunner', description: 'The digital parasite. You fry brains and override cybernetics from the shadows.', exampleBuild: 'Neural Deck + Monowire', skillTree: [
    { name: 'Breach Protocol', description: 'Upload a virus to weaken enemy cybernetics before combat.' },
    { name: 'Neural Overload', description: 'Fry an enemy\'s optics or motor functions temporarily.' },
    { name: 'Daemon Summoning', description: 'Deploy autonomous hacking programs to disrupt networks.' }
  ]},
  { name: 'Fixer', description: 'The underground broker. You control the streets, calling in favors and manipulating factions.', exampleBuild: 'Smart Pistol + Drone Swarm', skillTree: [
    { name: 'Call in a Favor', description: 'Summon allied gang members or mercenaries to assist you.' },
    { name: 'Black Market Contacts', description: 'Access high-tier weapons and gear anywhere in the city.' },
    { name: 'Silver Tongue', description: 'Talk your way out of hostile encounters or negotiate better payouts.' }
  ]},
  { name: 'Techie', description: 'The hardware god. You build, sabotage, and enhance gear beyond factory limits.', exampleBuild: 'Custom Shotgun + Turrets', skillTree: [
    { name: 'Deploy Turret', description: 'Set up an automated defense turret.' },
    { name: 'EMP Grenade', description: 'Disable electronics, shields, and cybernetics in an area.' },
    { name: 'Overcharge Weapon', description: 'Temporarily boost a weapon\'s damage at the cost of durability.' }
  ]},
  { name: 'Rockboy/Girl', description: 'The cultural arsonist. You use your charisma to incite riots and manipulate the masses.', exampleBuild: 'Sonic Guitar + Flashbangs', skillTree: [
    { name: 'Sonic Blast', description: 'Unleash a deafening soundwave that stuns and damages enemies.' },
    { name: 'Incite Riot', description: 'Turn neutral NPCs hostile against your enemies.' },
    { name: 'Groupie Swarm', description: 'Use adoring fans as a human shield or distraction.' }
  ]},
  { name: 'Assassin', description: 'The silent predator. You specialize in high-tech toxins and guaranteed gore finishers.', exampleBuild: 'Sniper Rifle + Optical Camo', skillTree: [
    { name: 'Optical Camo', description: 'Become invisible to the naked eye and cameras for a short duration.' },
    { name: 'Toxic Blade', description: 'Coat melee weapons in fast-acting synthetic neurotoxins.' },
    { name: 'Sniper\'s Focus', description: 'Massively increased damage when attacking from extreme range.' }
  ]},
  { name: 'Enforcer', description: 'The heavy hitter. You ignore pain and dish out massive damage with heavy weapons.', exampleBuild: 'LMG + Subdermal Armor', skillTree: [
    { name: 'Juggernaut', description: 'Ignore stagger effects and reduce incoming damage while moving.' },
    { name: 'Suppressing Fire', description: 'Pin down enemies, reducing their accuracy and movement speed.' },
    { name: 'Brutal Takedown', description: 'Instantly kill a staggered enemy in close combat to restore health.' }
  ]},
  { name: 'Ripperdoc', description: 'The black-market surgeon. You specialize in non-consensual mid-encounter modifications.', exampleBuild: 'Scalpel-Claws + Stim-Injectors', skillTree: [
    { name: 'Combat Stim', description: 'Inject yourself or an ally to boost speed, damage, and ignore pain.' },
    { name: 'Nerve Strike', description: 'Target biological weak points to paralyze or cripple enemies.' },
    { name: 'Cyber-Scavenge', description: 'Rip cybernetics from defeated foes to repair your own gear or sell.' }
  ]}
];

const COMPANION_ABILITIES = {
  fantasy: [
    { name: 'Aethelgard\'s Aegis', description: 'Defense Buff: +2 Armor for 3 turns.', effect: 'Defense Buff' },
    { name: 'Spectral Strike', description: 'Attack Buff: +1d6 to next melee attack.', effect: 'Attack Buff' },
    { name: 'Ghostly Haste', description: 'Speed Buff: +2 AGI for 3 turns.', effect: 'Speed Buff' }
  ],
  cyberpunk: [
    { name: 'V.E.R.A.\'s Firewall', description: 'Defense Buff: +2 Armor for 3 turns.', effect: 'Defense Buff' },
    { name: 'Neural Spike', description: 'Attack Buff: +1d6 to next ranged attack.', effect: 'Attack Buff' },
    { name: 'Overclock Protocol', description: 'Speed Buff: +2 AGI for 3 turns.', effect: 'Speed Buff' }
  ]
};

interface SaveSlot {
  id: string;
  name: string;
  date: string;
  lastMessage: string;
  setting: string;
}

interface CharacterCreationProps {
  onComplete: (profile: string, charName: string, setting: string) => void;
  saveSlots: SaveSlot[];
  onLoadGame: (slotId: string) => void;
  onClearSave: (slotId: string) => void;
}

export default function CharacterCreation({ onComplete, saveSlots, onLoadGame, onClearSave }: CharacterCreationProps) {
  const [showSaves, setShowSaves] = useState(saveSlots.length > 0);
  const [setting, setSetting] = useState<'fantasy' | 'cyberpunk'>('fantasy');
  const [raceOrigin, setRaceOrigin] = useState('');
  const [charClass, setCharClass] = useState('');
  const [companionAbility, setCompanionAbility] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  
  const [baseStats, setBaseStats] = useState({ str: 10, agi: 10, con: 10, int: 10, cha: 10 });
  const [points, setPoints] = useState(8);

  const [raceImg, setRaceImg] = useState<string | null>(null);
  const [raceBuildImg, setRaceBuildImg] = useState<string | null>(null);
  const [classImg, setClassImg] = useState<string | null>(null);
  const [classBuildImg, setClassBuildImg] = useState<string | null>(null);

  const [loadingRace, setLoadingRace] = useState(false);
  const [loadingRaceBuild, setLoadingRaceBuild] = useState(false);
  const [loadingClass, setLoadingClass] = useState(false);
  const [loadingClassBuild, setLoadingClassBuild] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmPoints, setShowConfirmPoints] = useState(false);

  useEffect(() => {
    if (!raceOrigin) {
      setRaceImg(null);
      setRaceBuildImg(null);
      return;
    }
    const raceData = (setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).find(r => r.name === raceOrigin);
    if (!raceData) return;

    let isMounted = true;
    
    const fetchRaceImgs = async () => {
      setLoadingRace(true);
      setLoadingRaceBuild(true);
      try {
        const theme = setting === 'fantasy' 
          ? 'grimdark high-fantasy, blood-sands setting, visceral, brutal, dark fantasy aesthetic, gritty, cinematic lighting, masterpiece' 
          : 'neon-grim cyberpunk, chrome-gut setting, hyper-capitalist, synthetic, neon-drenched, dystopian, gritty, cinematic lighting, masterpiece';
        
        const genderStr = gender ? `${gender.toLowerCase()} ` : '';
        
        const rImg = await generateArtwork(`A highly detailed, visceral concept art portrait of a ${genderStr}${raceData.name} character. ${theme}`);
        if (isMounted) setRaceImg(rImg);
        setLoadingRace(false);

        const rbImg = await generateArtwork(`A highly detailed, visceral concept art of a ${genderStr}${raceData.name} character as ${raceData.exampleBuild}. ${theme}`);
        if (isMounted) setRaceBuildImg(rbImg);
        setLoadingRaceBuild(false);
      } catch (e: any) {
        console.error(e);
        const errStr = typeof e === 'string' ? e : JSON.stringify(e, Object.getOwnPropertyNames(e));
        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
          setApiError("Image generation failed: API quota exceeded. Please check your Gemini API billing details.");
        }
        if (isMounted) { setLoadingRace(false); setLoadingRaceBuild(false); }
      }
    };
    fetchRaceImgs();
    return () => { isMounted = false; };
  }, [raceOrigin, setting, gender]);

  useEffect(() => {
    if (!charClass) {
      setClassImg(null);
      setClassBuildImg(null);
      return;
    }
    const classData = (setting === 'fantasy' ? FANTASY_CLASSES : CYBERPUNK_CLASSES).find(c => c.name === charClass);
    if (!classData) return;

    let isMounted = true;
    
    const fetchClassImgs = async () => {
      setLoadingClass(true);
      setLoadingClassBuild(true);
      try {
        const theme = setting === 'fantasy' 
          ? 'grimdark high-fantasy, blood-sands setting, visceral, brutal, dark fantasy aesthetic, gritty, cinematic lighting, masterpiece' 
          : 'neon-grim cyberpunk, chrome-gut setting, hyper-capitalist, synthetic, neon-drenched, dystopian, gritty, cinematic lighting, masterpiece';
        
        const genderStr = gender ? `${gender.toLowerCase()} ` : '';
        
        const cImg = await generateArtwork(`A highly detailed, visceral concept art portrait of a ${genderStr}${classData.name} class character. ${theme}`);
        if (isMounted) setClassImg(cImg);
        setLoadingClass(false);

        const cbImg = await generateArtwork(`A highly detailed, visceral concept art of a ${genderStr}${classData.name} character as ${classData.exampleBuild}. ${theme}`);
        if (isMounted) setClassBuildImg(cbImg);
        setLoadingClassBuild(false);
      } catch (e: any) {
        console.error(e);
        const errStr = typeof e === 'string' ? e : JSON.stringify(e, Object.getOwnPropertyNames(e));
        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
          setApiError("Image generation failed: API quota exceeded. Please check your Gemini API billing details.");
        }
        if (isMounted) { setLoadingClass(false); setLoadingClassBuild(false); }
      }
    };
    fetchClassImgs();
    return () => { isMounted = false; };
  }, [charClass, setting, gender]);

  const handleStatChange = (stat: keyof typeof baseStats, delta: number) => {
    if (delta > 0 && points > 0) {
      setBaseStats(prev => ({ ...prev, [stat]: prev[stat] + 1 }));
      setPoints(p => p - 1);
    } else if (delta < 0 && baseStats[stat] > 10) {
      setBaseStats(prev => ({ ...prev, [stat]: prev[stat] - 1 }));
      setPoints(p => p + 1);
    }
  };

  const getBonuses = () => {
    if (setting === 'fantasy') {
      return FANTASY_RACES.find(r => r.name === raceOrigin)?.bonuses || { str: 0, agi: 0, con: 0, int: 0, cha: 0 };
    } else {
      return CYBERPUNK_ORIGINS.find(o => o.name === raceOrigin)?.bonuses || { str: 0, agi: 0, con: 0, int: 0, cha: 0 };
    }
  };

  const bonuses = getBonuses();
  const finalStats = {
    str: baseStats.str + bonuses.str,
    agi: baseStats.agi + bonuses.agi,
    con: baseStats.con + bonuses.con,
    int: baseStats.int + bonuses.int,
    cha: baseStats.cha + bonuses.cha,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Please enter a character name.");
      return;
    }
    if (!gender) {
      setValidationError("Please select a gender.");
      return;
    }
    if (!raceOrigin) {
      setValidationError(`Please select a ${setting === 'fantasy' ? 'race' : 'origin'}.`);
      return;
    }
    if (!charClass) {
      setValidationError("Please select a class.");
      return;
    }
    if (!companionAbility) {
      setValidationError("Please select a companion ability.");
      return;
    }
    if (points > 0 && !showConfirmPoints) {
      setShowConfirmPoints(true);
      return;
    }

    const raceData = (setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).find(r => r.name === raceOrigin);
    const classData = (setting === 'fantasy' ? FANTASY_CLASSES : CYBERPUNK_CLASSES).find(c => c.name === charClass);
    const abilityData = COMPANION_ABILITIES[setting].find(a => a.name === companionAbility);

    const profile = `
Name: ${name}
Gender: ${gender}
Setting: ${setting === 'fantasy' ? 'High-Grit Fantasy (Blood-Sands)' : 'Neon-Grim Cyberpunk (Chrome-Gut)'}
${setting === 'fantasy' ? 'Race' : 'Origin'}: ${raceOrigin}
Racial Ability: ${raceData?.racialSkill.name} - ${raceData?.racialSkill.description}
Class: ${charClass}
Class Skill Tree: ${classData?.skillTree.map(s => `${s.name} (${s.description})`).join(', ')}
Companion Initial Ability: ${abilityData?.name} (${abilityData?.description})
Level 1 Stat Bank: STR: ${finalStats.str} | AGI: ${finalStats.agi} | CON: ${finalStats.con} | INT: ${finalStats.int} | CHA: ${finalStats.cha}
`;
    onComplete(profile, name, setting);
  };

  if (showSaves) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 flex items-start justify-center font-sans relative overflow-x-hidden">
        <div className="fixed inset-0 bg-[url('https://picsum.photos/seed/grimdark/1920/1080?blur=10')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none"></div>
        <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none"></div>

        <div className="max-w-2xl w-full glass-panel p-6 md:p-10 rounded-2xl z-10 my-4 md:my-8 relative">
          <div className="text-center mb-10 border-b border-white/5 pb-8">
            <h1 className="text-4xl font-bold text-zinc-100 uppercase tracking-[0.2em] font-serif mb-2">
              Omni-DM
            </h1>
            <div className="text-xs text-red-500/80 uppercase tracking-[0.3em]">The Definitive Chronicles</div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-widest">Saved Campaigns</h2>
              <button 
                onClick={() => setShowSaves(false)}
                className="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 text-red-100 font-bold uppercase tracking-widest rounded-lg transition-all border border-red-900/50 text-xs"
              >
                New Campaign
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {saveSlots.map(slot => (
                <div key={slot.id} className="group relative p-5 bg-zinc-900/60 border border-white/5 rounded-xl hover:border-red-900/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">{slot.name}</h3>
                      <div className={`text-[10px] uppercase tracking-widest font-bold ${slot.setting === 'fantasy' ? 'text-red-500' : 'text-cyan-500'}`}>
                        {slot.setting === 'fantasy' ? 'Blood-Sands' : 'Chrome-Gut'}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">{slot.date}</div>
                  </div>
                  
                  <p className="text-xs text-zinc-400 italic mb-4 line-clamp-2">"{slot.lastMessage}"</p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => onLoadGame(slot.id)}
                      className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-100 text-xs font-bold uppercase tracking-widest rounded-lg border border-red-900/30 transition-all"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => onClearSave(slot.id)}
                      className="px-3 py-2 bg-zinc-800 hover:bg-red-900/20 hover:text-red-400 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-lg border border-white/5 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 flex items-start justify-center font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[url('https://picsum.photos/seed/grimdark/1920/1080?blur=10')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none"></div>
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none"></div>

      <div className="max-w-2xl w-full glass-panel p-6 md:p-10 rounded-2xl z-10 my-4 md:my-8 relative">
        <div className="text-center mb-10 border-b border-white/5 pb-8 relative">
          {saveSlots.length > 0 && (
            <button 
              onClick={() => setShowSaves(true)}
              className="absolute left-0 top-0 text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              ← Back to Saves
            </button>
          )}
          {apiError && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 bg-red-900/90 border border-red-500 text-red-100 px-4 py-2 rounded-lg text-sm z-50 shadow-lg flex items-center gap-3">
              <span>{apiError}</span>
              <button 
                onClick={() => setApiError(null)}
                className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-[10px] uppercase font-bold"
              >
                Dismiss
              </button>
            </div>
          )}
          {validationError && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 bg-amber-900/90 border border-amber-500 text-amber-100 px-4 py-2 rounded-lg text-sm z-50 shadow-lg">
              {validationError}
            </div>
          )}
          <h1 className="text-4xl font-bold text-zinc-100 uppercase tracking-[0.2em] font-serif mb-2">
            Omni-DM
          </h1>
          <div className="text-xs text-red-500/80 uppercase tracking-[0.3em]">The Definitive Chronicles</div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">Character Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">Gender</label>
              <select 
                value={gender} 
                onChange={e => setGender(e.target.value)}
                className="w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all font-mono appearance-none"
                required
              >
                <option value="">Select...</option>
                <option value="Male" className="bg-zinc-900">Male</option>
                <option value="Female" className="bg-zinc-900">Female</option>
                <option value="Bitter This/Better That" className="bg-zinc-900">Bitter This/Better That</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => { setSetting('fantasy'); setRaceOrigin(''); setCharClass(''); }}
              className={`p-6 rounded-xl border transition-all ${setting === 'fantasy' ? 'border-red-600/50 bg-red-950/20 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.15)]' : 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50'}`}
            >
              <div className="font-bold uppercase tracking-widest mb-2 font-serif text-lg">Blood-Sands</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">High-Grit Fantasy</div>
            </button>
            <button
              type="button"
              onClick={() => { setSetting('cyberpunk'); setRaceOrigin(''); setCharClass(''); }}
              className={`p-6 rounded-xl border transition-all ${setting === 'cyberpunk' ? 'border-cyan-600/50 bg-cyan-950/20 text-cyan-400 shadow-[0_0_15px_rgba(8,145,178,0.15)]' : 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50'}`}
            >
              <div className="font-bold uppercase tracking-widest mb-2 font-serif text-lg">Chrome-Gut</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Neon-Grim Cyberpunk</div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">
                  {setting === 'fantasy' ? 'Race' : 'Origin'}
                </label>
                <select 
                  value={raceOrigin} 
                  onChange={e => setRaceOrigin(e.target.value)}
                  className="w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all font-mono appearance-none"
                  required
                >
                  <option value="">Select...</option>
                  {(setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).map(r => (
                    <option key={r.name} value={r.name} className="bg-zinc-900">{r.name}</option>
                  ))}
                </select>
              </div>
              {raceOrigin && (
                <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl text-sm space-y-4">
                  <div>
                    <p className="text-zinc-300 mb-3">{(setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).find(r => r.name === raceOrigin)?.description}</p>
                    
                    <div className="mb-3 p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                      <p className="text-red-400 font-bold uppercase tracking-widest text-xs mb-1">
                        Racial Ability: {(setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).find(r => r.name === raceOrigin)?.racialSkill.name}
                      </p>
                      <p className="text-zinc-400 text-xs">
                        {(setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).find(r => r.name === raceOrigin)?.racialSkill.description}
                      </p>
                    </div>

                    <div className="relative w-full aspect-square bg-black/50 rounded-lg overflow-hidden border border-white/5">
                      {loadingRace ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs">Generating Art...</span>
                        </div>
                      ) : raceImg ? (
                        <img src={raceImg} alt={raceOrigin} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-3"><span className="text-zinc-400 font-bold">Example Build:</span> {(setting === 'fantasy' ? FANTASY_RACES : CYBERPUNK_ORIGINS).find(r => r.name === raceOrigin)?.exampleBuild}</p>
                    <div className="relative w-full aspect-square bg-black/50 rounded-lg overflow-hidden border border-white/5">
                      {loadingRaceBuild ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs">Generating Build...</span>
                        </div>
                      ) : raceBuildImg ? (
                        <img src={raceBuildImg} alt="Build Example" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">Class</label>
                <select 
                  value={charClass} 
                  onChange={e => setCharClass(e.target.value)}
                  className="w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all font-mono appearance-none"
                  required
                >
                  <option value="">Select...</option>
                  {(setting === 'fantasy' ? FANTASY_CLASSES : CYBERPUNK_CLASSES).map(c => (
                    <option key={c.name} value={c.name} className="bg-zinc-900">{c.name}</option>
                  ))}
                </select>
              </div>
              {charClass && (
                <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl text-sm space-y-4">
                  <div>
                    <p className="text-zinc-300 mb-3">{(setting === 'fantasy' ? FANTASY_CLASSES : CYBERPUNK_CLASSES).find(c => c.name === charClass)?.description}</p>
                    
                    <div className="mb-3 space-y-2">
                      <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Starter Skill Tree:</p>
                      {(setting === 'fantasy' ? FANTASY_CLASSES : CYBERPUNK_CLASSES).find(c => c.name === charClass)?.skillTree.map(skill => (
                        <div key={skill.name} className="p-2 bg-cyan-950/20 border border-cyan-900/30 rounded-lg">
                          <p className="text-zinc-200 font-bold text-xs">{skill.name}</p>
                          <p className="text-zinc-500 text-[10px]">{skill.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="relative w-full aspect-square bg-black/50 rounded-lg overflow-hidden border border-white/5">
                      {loadingClass ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs">Generating Art...</span>
                        </div>
                      ) : classImg ? (
                        <img src={classImg} alt={charClass} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-3"><span className="text-zinc-400 font-bold">Example Build:</span> {(setting === 'fantasy' ? FANTASY_CLASSES : CYBERPUNK_CLASSES).find(c => c.name === charClass)?.exampleBuild}</p>
                    <div className="relative w-full aspect-square bg-black/50 rounded-lg overflow-hidden border border-white/5">
                      {loadingClassBuild ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs">Generating Build...</span>
                        </div>
                      ) : classBuildImg ? (
                        <img src={classBuildImg} alt="Build Example" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-xl">
            <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">Companion Initial Ability</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {COMPANION_ABILITIES[setting].map(ability => (
                <button
                  key={ability.name}
                  type="button"
                  onClick={() => setCompanionAbility(ability.name)}
                  className={`p-4 rounded-xl border text-left transition-all ${companionAbility === ability.name ? 'border-cyan-600/50 bg-cyan-950/20 text-cyan-400' : 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50'}`}
                >
                  <div className="font-bold text-xs uppercase tracking-widest mb-1">{ability.name}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{ability.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold uppercase tracking-widest text-zinc-400 text-sm">Stat Allocation</h3>
              <span className="text-red-400 text-xs font-mono uppercase tracking-widest bg-red-950/30 px-3 py-1 rounded-full border border-red-900/30">Points: {points}</span>
            </div>
            <div className="space-y-4">
              {(['str', 'agi', 'con', 'int', 'cha'] as const).map(stat => (
                <div key={stat} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900/40 transition-colors">
                  <div className="w-24 font-bold uppercase tracking-widest text-zinc-500 text-sm">{stat}</div>
                  <div className="flex items-center space-x-6">
                    <button type="button" onClick={() => handleStatChange(stat, -1)} className="w-10 h-10 md:w-8 md:h-8 rounded-lg bg-zinc-900/80 border border-white/5 hover:bg-zinc-800 hover:border-white/10 disabled:opacity-30 transition-all flex items-center justify-center text-lg" disabled={baseStats[stat] <= 10}>-</button>
                    <div className="w-16 text-center font-mono font-bold text-zinc-200 text-lg">
                      {finalStats[stat]}
                      {bonuses[stat] !== 0 && (
                        <span className={`text-xs ml-2 ${bonuses[stat] > 0 ? 'text-cyan-500' : 'text-red-500'}`}>
                          ({bonuses[stat] > 0 ? '+' : ''}{bonuses[stat]})
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={() => handleStatChange(stat, 1)} className="w-10 h-10 md:w-8 md:h-8 rounded-lg bg-zinc-900/80 border border-white/5 hover:bg-zinc-800 hover:border-white/10 disabled:opacity-30 transition-all flex items-center justify-center text-lg" disabled={points === 0}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showConfirmPoints && (
            <div className="p-6 bg-amber-950/20 border border-amber-900/50 rounded-xl text-center space-y-4">
              <p className="text-sm text-amber-200 font-mono">You still have <span className="font-bold">{points}</span> neural enhancement points unallocated. Proceed with current configuration?</p>
              <div className="flex gap-4 justify-center">
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-900/40 hover:bg-amber-800/60 text-amber-100 font-bold uppercase tracking-widest rounded-lg transition-all border border-amber-900/50 text-xs"
                >
                  Confirm Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmPoints(false)}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase tracking-widest rounded-lg transition-all border border-white/5 text-xs"
                >
                  Back to Stats
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-5 bg-red-900/40 hover:bg-red-800/60 text-red-100 font-bold uppercase tracking-[0.2em] rounded-xl transition-all border border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:shadow-[0_0_30px_rgba(220,38,38,0.2)] mt-8"
          >
            Enter the Void
          </button>
        </form>
      </div>
    </div>
  );
}
