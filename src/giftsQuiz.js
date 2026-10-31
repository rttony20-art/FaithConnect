// "Discover your God-given gifts" - the questions, the gifts, and the scoring (no screen code here).
//
// Fairness rules this file keeps (scripts/check-gifts-quiz.mjs tests them):
//  * every answer is tied to exactly ONE gift, so no gift gets bonus points;
//  * every gift appears as an answer exactly 4 times, and each pair of gifts meets at most once;
//  * answers and questions are shuffled each time, so picking "the first one" every time
//    gives a random mix instead of always the same result.

export const GIFTS = {
  apostle:       { title: "Apostle: starting new things", group: "Leadership gifts (Ephesians 4)", desc: "You may be good at starting new things and building teams. You want to take the gospel or a ministry to places where nothing exists yet." },
  prophet:       { title: "Prophet: speaking what God is saying", group: "Leadership gifts (Ephesians 4)", desc: "You may often sense what God is saying and feel brave enough to share it with love. Always check what you sense against the Bible and with wise leaders." },
  evangelist:    { title: "Evangelist: sharing the good news", group: "Leadership gifts (Ephesians 4)", desc: "You may find it easy to tell people about Jesus. You make friends with people who are far from God and help them take a first step toward Him." },
  pastor:        { title: "Pastor: caring for people", group: "Leadership gifts (Ephesians 4)", desc: "You may be good at caring for people over a long time. You walk with them, help them grow, and help them stay close to God." },
  teacher:       { title: "Teacher: explaining God's Word", group: "Leadership gifts (Ephesians 4)", desc: "You may love studying the Bible and making it easy to understand. You help people build a strong base of truth." },
  wisdom:        { title: "Word of wisdom: knowing what to do", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may often find the right advice for a hard situation and help people see God's way forward." },
  knowledge:     { title: "Word of knowledge: knowing what you could not know", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may sometimes know something about a person or situation that you had no way to know. It shows them that God sees them." },
  faith:         { title: "Gift of faith: trusting God when it looks impossible", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may have a calm, strong trust that God will act, even when things look impossible and others have given up." },
  healing:       { title: "Healing and miracles", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may feel drawn to pray for people who are sick or hurting. You expect God to heal and to show His power." },
  discernment:   { title: "Discernment: sensing what is from God", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may sense whether a teaching, a person or a place is truly from God. Use this gift with humility, and check it with the Bible and wise leaders." },
  tongues:       { title: "Tongues and explaining them", group: "Gifts of the Spirit (1 Corinthians 12)", desc: "You may be drawn to deep worship and prayer in the Spirit. Sometimes you may help others understand what is being said." },
  intercession:  { title: "Intercession: praying for others", group: "Gifts of prayer and care", desc: "You may be called to pray faithfully for people, churches and countries, often where nobody sees." },
  mercy:         { title: "Mercy: showing kindness to people who hurt", group: "Gifts of prayer and care (Romans 12)", desc: "You may feel other people's pain deeply. You want to comfort, help and stand with people who are hurting or forgotten." },
  service:       { title: "Service: helping in practical ways", group: "Gifts of prayer and care (Romans 12)", desc: "You may love meeting practical needs and working behind the scenes, so that people and ministries can do well." },
  encouragement: { title: "Encouragement: lifting people up", group: "Gifts of prayer and care (Romans 12)", desc: "You may be good at lifting people up, giving them hope, and helping them keep going in their faith." },
};

export const GIFT_KEYS = Object.keys(GIFTS);

// The five parts (shown as small headings above each question).
export const INDICATORS = [
  { title: "What weighs on my heart", intro: "Think about the problems you keep caring about." },
  { title: "What I sense from God", intro: "Think about what you feel when you pray, read the Bible and serve." },
  { title: "Where God has placed me", intro: "Think about the things that have happened in your life and the chances God has given you." },
  { title: "What others see in me", intro: "Think about what mature, trusted Christians have told you." },
  { title: "What I truly want", intro: "Think about what you really want to do for God and for other people." },
];

// 15 questions, 4 answers each: [gift, wording]. Three questions per part, in order.
export const QUESTIONS = [
  { q: "Which problem do you worry about most, even when nobody asks you to?", a: [
    ["apostle", "Places with no church, where nobody is starting anything"],
    ["prophet", "Believers moving away from God's ways while everyone stays quiet"],
    ["pastor", "Believers who are struggling and have nobody walking with them"],
    ["faith", "Hard situations where people have stopped believing God can help"] ] },
  { q: "When you see a need around you, what do you feel first?", a: [
    ["prophet", "A strong sense of what God is saying about it, and a wish to say it"],
    ["evangelist", "Sadness for people who have never clearly heard the good news"],
    ["teacher", "Frustration that people do not understand what the Bible really says"],
    ["healing", "A wish to put my hands on sick people and pray for them"] ] },
  { q: "Which situation would be hardest for you to walk away from?", a: [
    ["evangelist", "A stranger who is ready to talk about Jesus right now"],
    ["pastor", "A church member who is quietly going through a hard time alone"],
    ["wisdom", "A group that cannot decide and needs wise advice from God"],
    ["discernment", "A teaching or a person that sounds good, but something inside you says no"] ] },

  { q: "When you pray or read the Bible, what does God often put on your heart?", a: [
    ["pastor", "The names of people to visit, comfort and stay close to"],
    ["teacher", "A Bible passage that you feel you must explain to others"],
    ["knowledge", "Sudden knowledge about a person or situation that you had no way to know"],
    ["tongues", "Prayer and praise that go beyond your own words"] ] },
  { q: "When you serve, how does the Holy Spirit most often work through you?", a: [
    ["teacher", "Hard things become clear and simple when I explain them"],
    ["wisdom", "The right advice comes at the right time, and it turns out to be wise"],
    ["faith", "A calm certainty that God will come through, while others doubt"],
    ["intercession", "I feel pulled into long, serious prayer for someone or something"] ] },
  { q: "Which of these has happened to you more than once?", a: [
    ["wisdom", "People used your advice because it solved a problem nobody else could solve"],
    ["knowledge", "You knew something about a person's life, and it was later proven true"],
    ["healing", "Someone you prayed for got better in a way that surprised you"],
    ["mercy", "You felt someone's pain before they said a word, and you felt it with them"] ] },

  { q: "Looking at your life so far, which kind of moment stands out most?", a: [
    ["knowledge", "Times I knew something that helped or protected someone"],
    ["faith", "Times I trusted God when it made no sense, and He came through"],
    ["discernment", "Times I felt something was spiritually wrong, and later I was proven right"],
    ["service", "Times I quietly set things up and fixed them so others could focus"] ] },
  { q: "What have you seen God do through you or near you?", a: [
    ["faith", "Provision, open doors, or answers to prayer that others had given up on"],
    ["healing", "People getting better after prayer, or a sick person getting hope again"],
    ["tongues", "Moments of deep worship or prayer that touched everyone in the room"],
    ["encouragement", "People finding strength to keep going after talking with me"] ] },
  { q: "Which chance keeps coming to you again and again?", a: [
    ["healing", "Praying with people who are sick or hurting"],
    ["discernment", "Being asked to check a decision, a teaching or a person"],
    ["intercession", "Being asked, again and again, to pray for others"],
    ["apostle", "Being asked to start something new, or to lead where nothing exists yet"] ] },

  { q: "What have mature believers said about you?", a: [
    ["discernment", "You can tell when something is wrong, even before you can say why"],
    ["tongues", "Your worship and prayer lift people up and change the mood in the room"],
    ["mercy", "You are gentle and kind, and people feel safe with you"],
    ["prophet", "You say hard things that people need to hear, and you say them with love"] ] },
  { q: "Which comment have you heard more than once?", a: [
    ["tongues", "People are moved when you pray or worship in the Spirit"],
    ["intercession", "You are the one people ask to pray for them, and you really do it"],
    ["service", "You keep everything running well. We would be lost without you"],
    ["evangelist", "You make people feel welcome, and you talk about Jesus in a natural way"] ] },
  { q: "Which job would trusted leaders most likely give you?", a: [
    ["intercession", "Leading a prayer team or a night of prayer"],
    ["mercy", "Visiting and helping people who are hurting or in need"],
    ["encouragement", "Cheering up new or struggling believers"],
    ["pastor", "Caring for a small group and helping them grow close to God"] ] },

  { q: "If you could give your life to one kind of work for God, which would you choose?", a: [
    ["mercy", "Caring for the poor, the sick, the lonely and the forgotten"],
    ["service", "Using my time and practical skills to keep ministries running"],
    ["apostle", "Starting new churches or ministries in places that have none"],
    ["teacher", "Studying God's Word deeply and teaching it to others"] ] },
  { q: "What would you gladly do even if nobody ever said thank you?", a: [
    ["service", "Setting up, cleaning up and fixing things so others can worship"],
    ["encouragement", "Sending a message, a verse or a visit that cheers someone up"],
    ["prophet", "Saying what I believe God is saying, even when it costs me"],
    ["wisdom", "Helping people think through their problems and find God's way"] ] },
  { q: "Which result would make you happiest?", a: [
    ["encouragement", "Someone who wanted to give up decides to keep going in faith"],
    ["apostle", "A new ministry or group exists because I helped start it"],
    ["evangelist", "Someone decides to follow Jesus for the first time"],
    ["knowledge", "Someone sees that God knew exactly what they needed, and I helped them see it"] ] },
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
