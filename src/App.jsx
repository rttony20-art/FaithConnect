import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Compass, Heart, RotateCcw, Sparkles, Users } from "lucide-react";

const INDICATORS = [
  {
    title: "The Holy Burden",
    intro: "Notice the needs, problems, or spiritual concerns that consistently move your heart.",
    icon: Heart,
    questions: [
      {
        q: "Which need most often weighs on your heart?",
        options: [
          { label: "People misunderstanding Scripture or being misled", tags: ["teaching", "discernment", "prophetic"] },
          { label: "People who are hurting, lonely, or overlooked", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "People who do not know Jesus or have lost hope", tags: ["evangelism", "apostolic"] },
          { label: "Practical needs in my church or community", tags: ["service", "leadership", "mercy"] }
        ]
      },
      {
        q: "When you notice a serious problem, what do you most want to do?",
        options: [
          { label: "Study the Bible and help people understand the truth", tags: ["teaching", "discernment"] },
          { label: "Pray with people and walk alongside them", tags: ["pastoral", "intercession", "mercy"] },
          { label: "Speak up, call people back to faithfulness, or warn them carefully", tags: ["prophetic", "leadership", "discernment"] },
          { label: "Gather people and organize a practical response", tags: ["leadership", "service", "apostolic"] }
        ]
      },
      {
        q: "Which situation would be hardest for you to ignore?",
        options: [
          { label: "A confusing Bible passage that people keep misunderstanding", tags: ["teaching", "discernment"] },
          { label: "Someone suffering without support or comfort", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "Someone who has never heard the gospel clearly", tags: ["evangelism", "apostolic"] },
          { label: "A church or ministry with a need no one is addressing", tags: ["service", "leadership", "apostolic"] }
        ]
      }
    ]
  },
  {
    title: "The Witness of the Spirit",
    intro: "Reflect on the kinds of service toward which prayer, Scripture, and conviction repeatedly draw you.",
    icon: Sparkles,
    questions: [
      {
        q: "During prayer or Bible reading, what kind of direction do you most often sense?",
        options: [
          { label: "A desire to understand truth deeply and explain it clearly", tags: ["teaching", "discernment"] },
          { label: "A concern to pray for people and their needs", tags: ["intercession", "pastoral", "mercy"] },
          { label: "A burden to share the gospel or encourage someone to follow Jesus", tags: ["evangelism", "apostolic"] },
          { label: "A conviction to encourage change, faithfulness, or justice", tags: ["prophetic", "leadership"] }
        ]
      },
      {
        q: "When serving God, when do you most often feel spiritually engaged?",
        options: [
          { label: "Teaching, explaining, or discussing Scripture", tags: ["teaching"] },
          { label: "Listening, caring, and helping someone grow", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "Reaching new people or starting something that serves them", tags: ["evangelism", "apostolic"] },
          { label: "Praying, discerning, or helping people respond to God's truth", tags: ["intercession", "discernment", "prophetic"] }
        ]
      },
      {
        q: "Which statement best describes your spiritual sense of direction?",
        options: [
          { label: "I keep being drawn to teach and help people grow in understanding", tags: ["teaching", "pastoral"] },
          { label: "I keep being drawn to pray, care, and strengthen people", tags: ["intercession", "pastoral", "encouragement"] },
          { label: "I keep being drawn to share faith and reach beyond familiar circles", tags: ["evangelism", "apostolic"] },
          { label: "I keep being drawn to identify needs, lead, or call for faithful action", tags: ["leadership", "prophetic", "service"] }
        ]
      }
    ]
  },
  {
    title: "Providential Positioning",
    intro: "Consider how your experiences, relationships, skills, and opportunities may prepare you to serve.",
    icon: Compass,
    questions: [
      {
        q: "What do people naturally come to you for?",
        options: [
          { label: "Bible explanations, learning, or thoughtful answers", tags: ["teaching", "discernment"] },
          { label: "Comfort, prayer, advice, or personal support", tags: ["pastoral", "mercy", "encouragement", "intercession"] },
          { label: "Help taking action, organizing, or solving problems", tags: ["leadership", "service", "apostolic"] },
          { label: "Conversations about faith, hope, and knowing Jesus", tags: ["evangelism", "pastoral"] }
        ]
      },
      {
        q: "Which experience has most shaped how you want to serve?",
        options: [
          { label: "Studying Scripture or helping someone understand it", tags: ["teaching", "discernment"] },
          { label: "Walking with someone through pain or a difficult season", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "Sharing faith or seeing someone take a step toward Jesus", tags: ["evangelism", "apostolic"] },
          { label: "Building a team, organizing a project, or meeting a practical need", tags: ["leadership", "service", "apostolic"] }
        ]
      },
      {
        q: "What opportunity seems to keep appearing in your life?",
        options: [
          { label: "A chance to teach, mentor, or explain biblical truth", tags: ["teaching", "pastoral"] },
          { label: "A chance to care for people, pray, or offer encouragement", tags: ["pastoral", "mercy", "intercession"] },
          { label: "A chance to reach new people or begin a new ministry effort", tags: ["evangelism", "apostolic"] },
          { label: "A chance to lead, serve behind the scenes, or improve something", tags: ["leadership", "service"] }
        ]
      }
    ]
  },
  {
    title: "The Affirmations of the Righteous",
    intro: "Think about the strengths that mature, trustworthy believers have noticed in your life.",
    icon: Users,
    questions: [
      {
        q: "What do mature Christians most often affirm about you?",
        options: [
          { label: "I explain Scripture clearly and help others learn", tags: ["teaching"] },
          { label: "I care deeply, listen well, and help people feel supported", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "I speak truth courageously or notice spiritual concerns", tags: ["prophetic", "discernment"] },
          { label: "I bring people together, lead well, or get things done", tags: ["leadership", "service", "apostolic"] }
        ]
      },
      {
        q: "What positive change have people said your help brought them?",
        options: [
          { label: "They understood Scripture or doctrine more clearly", tags: ["teaching", "discernment"] },
          { label: "They felt cared for, encouraged, or restored", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "They became more open to Jesus or more confident sharing faith", tags: ["evangelism"] },
          { label: "They found direction, took action, or worked better with others", tags: ["leadership", "service", "apostolic"] }
        ]
      },
      {
        q: "Which responsibility would trusted church leaders most likely ask you to try?",
        options: [
          { label: "Lead a Bible study or help explain Christian teaching", tags: ["teaching"] },
          { label: "Support people through prayer, care, and discipleship", tags: ["pastoral", "intercession", "mercy"] },
          { label: "Help with outreach, evangelism, or welcoming new believers", tags: ["evangelism", "pastoral"] },
          { label: "Coordinate a ministry, serve practical needs, or help guide a team", tags: ["leadership", "service", "apostolic"] }
        ]
      }
    ]
  },
  {
    title: "Sanctified Desire",
    intro: "Explore the kinds of service you want to pursue for God's glory and the good of others.",
    icon: BookOpen,
    questions: [
      {
        q: "If you had time and training, which would you most want to do?",
        options: [
          { label: "Teach Scripture and help people grow in biblical understanding", tags: ["teaching"] },
          { label: "Care for people, disciple them, and help them mature", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "Share the gospel and help people begin following Jesus", tags: ["evangelism", "apostolic"] },
          { label: "Pray, discern, lead, or help a ministry meet an important need", tags: ["intercession", "discernment", "leadership", "service", "prophetic"] }
        ]
      },
      {
        q: "What would you gladly keep doing even without public recognition?",
        options: [
          { label: "Study and explain God's Word faithfully", tags: ["teaching"] },
          { label: "Pray for people and quietly care for them", tags: ["intercession", "mercy", "pastoral"] },
          { label: "Build relationships and speak about Jesus", tags: ["evangelism"] },
          { label: "Serve behind the scenes, organize, or help others succeed", tags: ["service", "leadership"] }
        ]
      },
      {
        q: "Which outcome would bring you the deepest sense of meaningful service?",
        options: [
          { label: "People understand truth and become grounded in Scripture", tags: ["teaching", "discernment"] },
          { label: "People are cared for, strengthened, and grow in Christ", tags: ["pastoral", "mercy", "encouragement"] },
          { label: "People encounter Jesus and begin or renew their faith", tags: ["evangelism", "apostolic"] },
          { label: "People are mobilized, needs are met, and the church is strengthened", tags: ["leadership", "service", "prophetic"] }
        ]
      }
    ]
  }
];

const GIFT_INFO = {
  teaching: { title: "Teaching", fivefold: "Teacher", desc: "You may be drawn to explain Scripture clearly, help people understand sound doctrine, and build a strong biblical foundation." },
  pastoral: { title: "Pastoral care and discipleship", fivefold: "Pastor", desc: "You may be gifted in caring for people, walking with them through seasons of life, and helping them mature in faith." },
  evangelism: { title: "Evangelism", fivefold: "Evangelist", desc: "You may be drawn to share the good news of Jesus, build bridges with people, and help them take steps toward faith." },
  prophetic: { title: "Prophetic encouragement and discernment", fivefold: "Prophet (an area to explore)", desc: "You may be sensitive to spiritual concerns and drawn to call people toward biblical faithfulness. This should be tested humbly against Scripture and wise counsel." },
  apostolic: { title: "Pioneering and ministry-building", fivefold: "Apostle (an area to explore)", desc: "You may enjoy starting new initiatives, building teams, and helping ministry reach people or places that are underserved." },
  mercy: { title: "Mercy and compassion", fivefold: "Related ministry strength", desc: "You may be especially moved to care for hurting people, notice overlooked needs, and offer practical compassion." },
  encouragement: { title: "Encouragement", fivefold: "Related ministry strength", desc: "You may have a strength in building others up, offering hope, and helping people keep going in faith." },
  service: { title: "Service and helps", fivefold: "Related ministry strength", desc: "You may be drawn to practical support that helps people and ministries flourish, often without needing the spotlight." },
  leadership: { title: "Leadership and administration", fivefold: "Related ministry strength", desc: "You may be able to organize people and resources, create direction, and help a group move toward a shared purpose." },
  intercession: { title: "Intercession", fivefold: "Related ministry strength", desc: "You may be drawn to sustained prayer for people, churches, and needs, supporting others through faithful intercession." },
  discernment: { title: "Discernment", fivefold: "Related ministry strength", desc: "You may be attentive to whether ideas and teaching align with Scripture. Grow this through humility, biblical study, and trusted counsel." }
};

const OPTIONS = ["Strongly resonates", "Somewhat resonates", "Not sure yet", "Rarely resonates"];

export default function PurposeDiscovery({ onBack, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const flatQuestions = useMemo(() => INDICATORS.flatMap((indicator, indicatorIndex) =>
    indicator.questions.map((question, questionIndex) => ({ ...question, indicatorIndex, questionIndex, indicator }))
  ), []);
  const current = flatQuestions[step];

  const results = useMemo(() => {
    const scores = {};
    flatQuestions.forEach((item, index) => {
      const answer = answers[index];
      if (answer == null || answer === 2 || answer === 3) return;
      const weight = answer === 0 ? 2 : 1;
      item.options[answer].tags.forEach(tag => { scores[tag] = (scores[tag] || 0) + weight; });
    });
    return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, score]) => ({ key, score, ...GIFT_INFO[key] }));
  }, [answers, flatQuestions]);

  const answeredCount = Object.keys(answers).length;
  const canFinish = answeredCount === flatQuestions.length;

  function choose(optionIndex) {
    setAnswers(previous => ({ ...previous, [step]: optionIndex }));
  }

  function finish() {
    setShowResults(true);
    if (onComplete) onComplete({ answers, results });
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setShowResults(false);
  }

  const panel = {
    background: "linear-gradient(145deg, rgba(22,27,48,.96), rgba(11,15,29,.96))",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 22,
    padding: 20,
    color: "#F8F4EA",
    boxShadow: "0 16px 40px rgba(0,0,0,.22)"
  };
  const button = (selected) => ({
    width: "100%", textAlign: "left", borderRadius: 13, padding: "13px 14px",
    border: selected ? "1px solid #8D9BFF" : "1px solid rgba(255,255,255,.12)",
    background: selected ? "rgba(93,108,255,.22)" : "rgba(255,255,255,.035)",
    color: "#F8F4EA", fontSize: 14, lineHeight: 1.45, cursor: "pointer"
  });

  if (showResults) {
    return (
      <div style={{ minHeight: "100%", padding: 18, color: "#F8F4EA", fontFamily: "Inter, sans-serif", overflowY: "auto" }}>
        <button onClick={onBack} style={{ background: "none", border: 0, color: "#B7C0FF", display: "flex", alignItems: "center", gap: 7, padding: "8px 0", cursor: "pointer" }}><ArrowLeft size={18}/> Back to Discover</button>
        <div style={{ ...panel, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#D6AE6E", fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}><Sparkles size={17}/> YOUR PURPOSE REFLECTION</div>
          <h1 style={{ fontFamily: "Lora, serif", fontSize: 28, margin: "12px 0 8px" }}>Possible gifts to explore</h1>
          <p style={{ color: "#C4C9D8", fontSize: 14, lineHeight: 1.65, marginTop: 0 }}>Your answers point toward these possible strengths. Treat them as starting points for prayer, practice, and conversations with mature believers—not a final verdict about God's calling.</p>
          {results.length === 0 ? <p style={{ lineHeight: 1.6 }}>There isn't a clear pattern yet. That's okay. Revisit these questions later, try serving in different areas, and ask trusted believers what strengths they see in you.</p> : results.map((result, index) => (
            <div key={result.key} style={{ marginTop: 14, padding: 15, borderRadius: 15, background: "rgba(255,255,255,.045)", border: "1px solid rgba(214,174,110,.24)" }}>
              <div style={{ color: "#D6AE6E", fontSize: 11, letterSpacing: 1.2, fontWeight: 700 }}> {index === 0 ? "STRONGEST PATTERN" : index === 1 ? "ANOTHER POSSIBILITY" : "ALSO WORTH EXPLORING"} </div>
              <h2 style={{ fontFamily: "Lora, serif", fontSize: 20, margin: "7px 0" }}>{result.title}</h2>
              <p style={{ color: "#E2E3EB", fontSize: 13.5, lineHeight: 1.65, margin: "0 0 8px" }}>{result.desc}</p>
              <div style={{ color: "#B7C0FF", fontSize: 12.5 }}><strong>Fivefold ministry connection:</strong> {result.fivefold}</div>
            </div>
          ))}
          <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14 }}>
            <strong style={{ color: "#D6AE6E" }}>A wise next step</strong>
            <p style={{ color: "#C4C9D8", fontSize: 13.5, lineHeight: 1.65 }}>Choose one small way to serve this month. Notice the fruit, seek feedback from mature Christians, and keep testing every impression against Scripture and the character of Jesus.</p>
            <p style={{ color: "#9FA7BC", fontSize: 11.5, lineHeight: 1.55 }}>The fivefold ministry in Ephesians 4:11 is one framework. The results may also point to other spiritual gifts or practical strengths; they do not confirm a ministry office.</p>
          </div>
          <button onClick={restart} style={{ marginTop: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", color: "#F8F4EA", borderRadius: 12, padding: "12px 15px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><RotateCcw size={16}/> Retake questions</button>
        </div>
      </div>
    );
  }

  const IndicatorIcon = current.indicator.icon;
  const indicatorNumber = current.indicatorIndex + 1;
  const questionInIndicator = current.questionIndex + 1;
  const total = flatQuestions.length;
  const progress = ((step + 1) / total) * 100;

  return (
    <div style={{ minHeight: "100%", padding: 18, color: "#F8F4EA", fontFamily: "Inter, sans-serif", overflowY: "auto" }}>
      <button onClick={onBack} style={{ background: "none", border: 0, color: "#B7C0FF", display: "flex", alignItems: "center", gap: 7, padding: "8px 0", cursor: "pointer" }}><ArrowLeft size={18}/> Back to Discover</button>
      <div style={{ ...panel, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: "#D6AE6E", fontSize: 11, fontWeight: 700, letterSpacing: 1.1 }}>
          <span>DISCOVER YOUR PURPOSE</span><span>{step + 1} OF {total}</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.1)", margin: "12px 0 18px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#526cff,#D6AE6E)", borderRadius: 99, transition: "width .2s" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(214,174,110,.12)", border: "1px solid rgba(214,174,110,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}><IndicatorIcon size={21} color="#D6AE6E"/></div>
          <div>
            <div style={{ fontSize: 11, color: "#AAB1C7" }}>INDICATOR {indicatorNumber} · QUESTION {questionInIndicator} OF 3</div>
            <h1 style={{ fontFamily: "Lora, serif", fontSize: 22, lineHeight: 1.2, margin: "4px 0 0" }}>{current.indicator.title}</h1>
          </div>
        </div>
        <p style={{ color: "#C4C9D8", fontSize: 13.5, lineHeight: 1.6 }}>{current.indicator.intro}</p>
        <h2 style={{ fontSize: 17, lineHeight: 1.45, margin: "18px 0 12px" }}>{current.q}</h2>
        <div style={{ display: "grid", gap: 9 }}>
          {current.options.map((option, index) => (
            <button key={option.label} onClick={() => choose(index)} style={button(answers[step] === index)}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", border: answers[step] === index ? "2px solid #A9B3FF" : "1px solid rgba(255,255,255,.28)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {answers[step] === index && <CheckCircle2 size={17} color="#A9B3FF"/>}
                </span>
                <span>{option.label}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))} style={{ flex: 1, border: "1px solid rgba(255,255,255,.13)", background: "rgba(255,255,255,.05)", color: step === 0 ? "#626a80" : "#F8F4EA", borderRadius: 12, padding: 12, cursor: step === 0 ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}><ArrowLeft size={16}/> Previous</button>
          {step < total - 1 ? (
            <button disabled={answers[step] == null} onClick={() => setStep(s => Math.min(total - 1, s + 1))} style={{ flex: 1, border: 0, background: answers[step] == null ? "#3C456A" : "linear-gradient(100deg,#526cff,#8d5cff)", color: "#fff", borderRadius: 12, padding: 12, cursor: answers[step] == null ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}>Next <ArrowRight size={16}/></button>
          ) : (
            <button disabled={!canFinish} onClick={finish} style={{ flex: 1, border: 0, background: canFinish ? "linear-gradient(100deg,#526cff,#8d5cff)" : "#3C456A", color: "#fff", borderRadius: 12, padding: 12, cursor: canFinish ? "pointer" : "not-allowed", display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}>See my results <Sparkles size={16}/></button>
          )}
        </div>
      </div>
      <p style={{ color: "#929AB0", fontSize: 11.5, lineHeight: 1.55, textAlign: "center", margin: "14px 6px" }}>There are no right or wrong answers. Answer honestly; your results are a reflection tool, not a final determination of your calling.</p>
    </div>
  );
}

