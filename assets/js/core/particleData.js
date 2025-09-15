// Japanese particle data with practice sentences
export const particleData = [
  {
    particle: "は",
    reading: "wa",
    function: "topic marker",
    description: "Marks what the sentence is about",
    examples: [
      {
        japanese: "私_学生です",
        english: "I am a student", 
        missing: 1,
        correct: "は",
        options: ["は", "が", "を"],
        explanation: "私 is the topic being discussed"
      },
      {
        japanese: "今日_天気がいいです",
        english: "Today's weather is good",
        missing: 2,
        correct: "は", 
        options: ["は", "が", "の"],
        explanation: "今日 is the topic of the sentence"
      },
      {
        japanese: "日本語_難しいです",
        english: "Japanese is difficult",
        missing: 3,
        correct: "は",
        options: ["は", "が", "を"],
        explanation: "日本語 is what we're talking about"
      }
    ]
  },
  {
    particle: "が",
    reading: "ga", 
    function: "subject marker",
    description: "Marks the grammatical subject, often for emphasis or new information",
    examples: [
      {
        japanese: "犬_好きです",
        english: "I like dogs",
        missing: 1,
        correct: "が",
        options: ["が", "は", "を"],
        explanation: "犬 is the object being liked (grammatical subject of 好き)"
      },
      {
        japanese: "雨_降っています",
        english: "It's raining",
        missing: 1,
        correct: "が",
        options: ["が", "は", "に"],
        explanation: "雨 is the subject performing the action"
      },
      {
        japanese: "誰_来ましたか",
        english: "Who came?",
        missing: 1,
        correct: "が",
        options: ["が", "は", "を"],
        explanation: "Question words typically use が"
      }
    ]
  },
  {
    particle: "を",
    reading: "wo/o",
    function: "direct object marker", 
    description: "Marks what receives the action of the verb",
    examples: [
      {
        japanese: "本_読みます",
        english: "I read a book",
        missing: 1,
        correct: "を",
        options: ["を", "が", "に"],
        explanation: "本 is what is being read (direct object)"
      },
      {
        japanese: "映画_見ました",
        english: "I watched a movie",
        missing: 2,
        correct: "を",
        options: ["を", "が", "で"],
        explanation: "映画 is what was watched"
      },
      {
        japanese: "日本語_勉強します",
        english: "I study Japanese",
        missing: 3,
        correct: "を",
        options: ["を", "に", "で"],
        explanation: "日本語 is what is being studied"
      }
    ]
  },
  {
    particle: "に",
    reading: "ni",
    function: "direction/time/indirect object marker",
    description: "Shows direction, time, or recipient of an action",
    examples: [
      {
        japanese: "学校_行きます",
        english: "I go to school",
        missing: 2,
        correct: "に",
        options: ["に", "で", "を"],
        explanation: "学校 is the destination"
      },
      {
        japanese: "友達_手紙を書きます",
        english: "I write a letter to my friend",
        missing: 2,
        correct: "に",
        options: ["に", "が", "を"],
        explanation: "友達 is the recipient of the letter"
      },
      {
        japanese: "七時_起きます",
        english: "I wake up at 7 o'clock",
        missing: 2,
        correct: "に",
        options: ["に", "で", "から"],
        explanation: "七時 is a specific time"
      }
    ]
  },
  {
    particle: "で",
    reading: "de",
    function: "location of action/method marker",
    description: "Shows where an action takes place or how something is done",
    examples: [
      {
        japanese: "図書館_勉強します",
        english: "I study at the library",
        missing: 3,
        correct: "で",
        options: ["で", "に", "を"],
        explanation: "図書館 is where the action takes place"
      },
      {
        japanese: "電車_行きます",
        english: "I go by train",
        missing: 2,
        correct: "で",
        options: ["で", "に", "が"],
        explanation: "電車 is the method of transportation"
      },
      {
        japanese: "日本語_話します",
        english: "I speak in Japanese",
        missing: 3,
        correct: "で",
        options: ["で", "を", "に"],
        explanation: "日本語 is the language used (method)"
      }
    ]
  },
  {
    particle: "から",
    reading: "kara",
    function: "starting point marker",
    description: "Shows starting point in time or space, or source",
    examples: [
      {
        japanese: "家_出ます",
        english: "I leave from home",
        missing: 1,
        correct: "から",
        options: ["から", "に", "で"],
        explanation: "家 is the starting point"
      },
      {
        japanese: "九時_始まります",
        english: "It starts from 9 o'clock",
        missing: 2,
        correct: "から",
        options: ["から", "に", "まで"],
        explanation: "九時 is the starting time"
      }
    ]
  },
  {
    particle: "まで",
    reading: "made",
    function: "ending point marker",
    description: "Shows ending point in time or space",
    examples: [
      {
        japanese: "駅_歩きます",
        english: "I walk to the station",
        missing: 1,
        correct: "まで",
        options: ["まで", "に", "で"],
        explanation: "駅 is the destination/end point"
      },
      {
        japanese: "五時_働きます",
        english: "I work until 5 o'clock",
        missing: 2,
        correct: "まで",
        options: ["まで", "に", "から"],
        explanation: "五時 is the ending time"
      }
    ]
  },
  {
    particle: "と",
    reading: "to",
    function: "conjunction/accompaniment marker",
    description: "Connects nouns or shows accompaniment",
    examples: [
      {
        japanese: "友達_映画を見ます",
        english: "I watch a movie with my friend",
        missing: 2,
        correct: "と",
        options: ["と", "に", "が"],
        explanation: "友達 is who you're with"
      },
      {
        japanese: "パン_牛乳を買います",
        english: "I buy bread and milk",
        missing: 1,
        correct: "と",
        options: ["と", "を", "に"],
        explanation: "と connects two items being bought"
      }
    ]
  }
];

// Difficulty progression
export const particleDifficulty = {
  beginner: ["は", "を", "が"],
  intermediate: ["に", "で", "から", "まで"], 
  advanced: ["と", "の", "へ", "より"]
};

// Common particle confusions for targeted practice
export const confusionPairs = [
  {particles: ["は", "が"], context: "topic vs subject"},
  {particles: ["に", "で"], context: "location markers"},
  {particles: ["から", "まで"], context: "starting vs ending points"},
  {particles: ["を", "が"], context: "object vs subject with certain verbs"}
];