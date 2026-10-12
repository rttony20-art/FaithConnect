// "What are you gifted for?" - the questions, the gifts, and the scoring (no screen code here).
//
// Fairness rules this file keeps (scripts/check-gifts-quiz.mjs tests them):
//  * every answer is tied to exactly ONE gift, so no gift gets bonus points;
//  * every gift appears as an answer exactly 4 times, and each pair of gifts meets at most once;
//  * answers and questions are shuffled each time, so picking "the first one" every time
//    gives a random mix instead of always the same result.

export const GIFTS = {
  apostle:       { title: "Apostolic: pioneering and building", group: "Fivefold ministry", desc: "You may be wired to start new things, send and build teams, and carry the gospel or a ministry into places where nothing exists yet." },
  prophet:       { title: "Prophetic: speaking what God is saying", group: "Fivefold ministry", desc: "You may be sensitive to what God is saying and drawn to call people back to Him with courage and care. Every impression should be tested against Scripture and wise counsel." },
  evangelist:    { title: "Evangelism", group: "Fivefold ministry", desc: "You may find it natural to bring the good news of Jesus to people, build bridges with those far from God, and help them take a first step toward Him." },
  pastor:        { title: "Pastoral care and shepherding", group: "Fivefold ministry", desc: "You may be gifted at looking after people over time: walking with them, guarding their growth, and helping them stay close to God." },
  teacher:       { title: "Teaching", group: "Fivefold ministry", desc: "You may be gifted at studying Scripture, making it clear, and helping people build a solid foundation of truth." },
  wisdom:        { title: "Word of wisdom", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may often receive the right counsel for a hard situation and be able to point people to God's way forward." },
  knowledge:     { title: "Word of knowledge", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may sometimes receive insight about a person or situation that you had no natural way to know, which helps them know God sees them." },
  faith:         { title: "Gift of faith", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may carry a steady, unusual confidence that God will act, even when a situation looks impossible and others have given up." },
  healing:       { title: "Healing and miracles", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may feel drawn to pray for the sick and hurting, expecting God to bring healing and show His power." },
  discernment:   { title: "Discerning of spirits", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may sense whether a teaching, a person, or an atmosphere is truly from God. Grow this with humility, Scripture and trusted counsel." },
  tongues:       { title: "Tongues and interpretation", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may be drawn to deep worship and prayer in the Spirit, and sometimes to help others understand what is being expressed." },
  intercession:  { title: "Intercession", group: "Gifts of prayer and care", desc: "You may be called to sustained, faithful prayer for people, churches and nations, often unseen by others." },
  mercy:         { title: "Mercy and compassion", group: "Gifts of prayer and care (Romans 12)", desc: "You may feel others' pain deeply and be moved to comfort, care for and stand with the hurting and the overlooked." },
  service:       { title: "Service and helps", group: "Gifts of prayer and care (Romans 12)", desc: "You may love meeting practical needs, working behind the scenes so that people and ministries can flourish." },
  encouragement: { title: "Encouragement", group: "Gifts of prayer and care (Romans 12)", desc: "You may have a gift for lifting people up, restoring hope, and helping them keep going in faith." },
};

export const GIFT_KEYS = Object.keys(GIFTS);

// The five indicators (shown as small headings above each question).
export const INDICATORS = [
  { title: "The Holy Burden", intro: "Notice the needs and concerns that keep weighing on your heart." },
  { title: "The Witness of the Spirit", intro: "Think about what you sense in prayer, in Scripture and as you serve." },
  { title: "Providential Positioning", intro: "Look at the experiences and opportunities God has put in your path." },
  { title: "The Affirmations of the Righteous", intro: "Think about what mature, trustworthy believers have noticed in you." },
  { title: "Sanctified Desire", intro: "Consider what you truly long to do for God's glory and the good of others." },
];

// 15 questions, 4 answers each: [gift, wording]. Three questions per indicator, in order.
export const QUESTIONS = [
  { q: "Which concern weighs on your heart the most, even when nobody asks you to care?", a: [
    ["apostle", "Places or people with no church, and no one starting anything there"],
    ["prophet", "Believers drifting from God's ways while everyone stays silent"],
    ["pastor", "Individual believers who are struggling and have no one walking with them"],
    ["faith", "Situations that look impossible, where people have stopped believing God can act"] ] },
  { q: "When you see a need around you, what stirs in you first?", a: [
    ["prophet", "A strong sense of what God is saying about it, and an urge to say it"],
    ["evangelist", "Sadness for people who have never heard the good news clearly"],
    ["teacher", "Frustration that people are confused about what the Bible actually says"],
    ["healing", "A desire to lay hands on the sick and pray for their healing"] ] },
  { q: "Which situation would be hardest for you to walk away from?", a: [
    ["evangelist", "A stranger who is open to talking about Jesus right now"],
    ["pastor", "A church member quietly going through a hard season alone"],
    ["wisdom", "A group stuck on a hard decision that needs a wise, God-given way forward"],
    ["discernment", "A teaching or a person that sounds right, but something in your spirit says it is not"] ] },

  { q: "In prayer or Bible reading, what does God seem to press on you most often?", a: [
    ["pastor", "Names of people to check on, comfort and stay close to"],
    ["teacher", "An understanding of a passage that you feel you must explain to others"],
    ["knowledge", "Sudden insight about a person or situation that you had no natural way to know"],
    ["tongues", "Prayer and praise that go beyond your own words, sometimes with a sense of their meaning"] ] },
  { q: "When you serve, how do you most often sense the Holy Spirit working through you?", a: [
    ["teacher", "Hard truths become clear and simple as I explain them"],
    ["wisdom", "The right advice comes at the right moment, and it proves wise"],
    ["faith", "A calm certainty that God will come through, while others doubt"],
    ["intercession", "I am drawn into long, heavy prayer for someone or something"] ] },
  { q: "Which of these has happened to you more than once?", a: [
    ["wisdom", "People kept your answer because it solved a problem others could not"],
    ["knowledge", "You knew a detail about someone's life that was later confirmed"],
    ["healing", "Someone you prayed for got better in a way that surprised you"],
    ["mercy", "You sensed someone's pain before they said anything, and felt it with them"] ] },

  { q: "Looking at your life so far, which kind of experience stands out most?", a: [
    ["knowledge", "Times I had accurate insight that helped or protected someone"],
    ["faith", "Times I stepped out in trust when it made no sense, and God came through"],
    ["discernment", "Times I sensed something was spiritually wrong and it later proved true"],
    ["service", "Times I quietly made things work, setting up, fixing and helping, so others could focus"] ] },
  { q: "What have you seen God do through you or around you?", a: [
    ["faith", "Provision, open doors, or answers to prayers others had given up on"],
    ["healing", "People recovering after prayer, or hope returning to someone who was sick"],
    ["tongues", "Moments of deep worship or prayer in the Spirit that moved the whole room"],
    ["encouragement", "People finding strength to keep going after talking with me"] ] },
  { q: "Which opportunity keeps being put in front of you?", a: [
    ["healing", "Praying with people who are sick or hurting"],
    ["discernment", "Being asked to weigh up a decision, a teaching or a person"],
    ["intercession", "Being asked, again and again, to pray for others and their needs"],
    ["apostle", "Being asked to start something new, or lead where nothing exists yet"] ] },

  { q: "What have mature believers said about you?", a: [
    ["discernment", "You can tell when something is off, even before you can say why"],
    ["tongues", "Your worship and prayer in the Spirit lifts others and changes the atmosphere"],
    ["mercy", "You are gentle and compassionate; people feel safe with you"],
    ["prophet", "You say difficult things people need to hear, and you say them with care"] ] },
  { q: "Which comment have you heard more than once?", a: [
    ["tongues", "People are stirred when you pray or worship in the Spirit"],
    ["intercession", "You are the one people ask to pray for them, and you really follow through"],
    ["service", "You keep everything running smoothly; we would be lost without you behind the scenes"],
    ["evangelist", "You make people feel welcome, and you talk about Jesus without it feeling awkward"] ] },
  { q: "Which responsibility would trusted leaders most likely hand to you?", a: [
    ["intercession", "Leading a prayer team or a night of prayer"],
    ["mercy", "Visiting and supporting people who are hurting or in need"],
    ["encouragement", "Cheering on new or struggling believers and keeping their spirits up"],
    ["pastor", "Looking after a small group and helping its members grow close to God"] ] },

  { q: "If you could give your life to one kind of work for God, which would you choose?", a: [
    ["mercy", "Caring for the poor, the sick, the lonely and the overlooked"],
    ["service", "Using my practical skills and time to keep ministries running"],
    ["apostle", "Pioneering new churches or ministries in places that have none"],
    ["teacher", "Studying God's Word in depth and teaching it to others"] ] },
  { q: "What would you gladly do even if nobody ever thanked you?", a: [
    ["service", "Setting up, cleaning up and fixing things so others can worship"],
    ["encouragement", "Sending a message, a verse or a visit that lifts someone's spirits"],
    ["prophet", "Speaking what I believe God is saying, even when it costs me"],
    ["wisdom", "Helping people think through their problems and find God's way"] ] },
  { q: "Which outcome would bring you the deepest joy?", a: [
    ["encouragement", "Someone who wanted to give up decides to keep going in faith"],
    ["apostle", "A new ministry or community exists because I helped start it"],
    ["evangelist", "Someone chooses to follow Jesus for the first time"],
    ["knowledge", "Someone realises God knew exactly what they needed, and I helped them see it"] ] },
];

function shuffle(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A fresh quiz: questions in random order, answers in random order inside each question.
// `rank` is a random order of the gifts, used only to break ties fairly.
export function buildQuiz(rnd = Math.random) {
  const questions = shuffle(QUESTIONS.map((item, i) => ({ ...item, indicator: Math.floor(i / 3) })), rnd)
    .map(item => ({ ...item, a: shuffle(item.a, rnd) }));
  return { questions, rank: shuffle(GIFT_KEYS, rnd) };
}

// answers: { [questionIndex]: chosenOptionIndex }. Returns the top gifts, best first.
export function scoreAnswers(quiz, answers, max = 3) {
  const score = {};
  quiz.questions.forEach((item, i) => {
    const pick = answers[i];
    if (pick == null) return;
    const gift = item.a[pick][0];
    score[gift] = (score[gift] || 0) + 1;
  });
  return Object.entries(score)
    .sort((x, y) => y[1] - x[1] || quiz.rank.indexOf(x[0]) - quiz.rank.indexOf(y[0]))
    .slice(0, max)
    .map(([key, points]) => ({ key, points, ...GIFTS[key] }));
}
