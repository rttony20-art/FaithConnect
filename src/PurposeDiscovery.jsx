import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Heart, BookOpen, RotateCcw, Sparkles, Users } from "lucide-react";
import { INDICATORS, buildQuiz, scoreAnswers } from "./giftsQuiz.js";

// One icon per indicator, in the same order as INDICATORS.
const ICONS = [Heart, Sparkles, Compass, Users, BookOpen];

// "What are you gifted for?" - 15 shuffled questions; questions and answers are in
// src/giftsQuiz.js.
export default function PurposeDiscovery({ onBack, onComplete }) {
  const [quiz, setQuiz] = useState(() => buildQuiz());
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const total = quiz.questions.length;
  const current = quiz.questions[step];
  const results = useMemo(() => scoreAnswers(quiz, answers), [quiz, answers]);
  const answeredCount = Object.keys(answers).length;
  const canFinish = answeredCount === total;

  function choose(optionIndex) {
    setAnswers(previous => ({ ...previous, [step]: optionIndex }));
  }

  function finish() {
    setShowResults(true);
    if (onComplete) onComplete({ results });
  }

  function restart() {
    setQuiz(buildQuiz()); // new order of questions and answers
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
        <button onClick={onBack} style={{ background: "none", border: 0, color: "#B7C0FF", display: "flex", alignItems: "center", gap: 7, padding: "8px 0", cursor: "pointer" }}><ArrowLeft size={18}/> Back</button>
        <div style={{ ...panel, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#D6AE6E", fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}><Sparkles size={17}/> YOUR GIFTS REFLECTION</div>
          <h1 style={{ fontFamily: "Lora, serif", fontSize: 28, margin: "12px 0 8px" }}>Possible gifts to explore</h1>
          <p style={{ color: "#C4C9D8", fontSize: 14, lineHeight: 1.65, marginTop: 0 }}>Your answers point toward these possible strengths. Treat them as starting points for prayer, practice, and conversations with mature believers—not a final verdict about God's calling.</p>
          {(results.length === 0 || results[0].points < 2) ? <p style={{ lineHeight: 1.6 }}>There isn't a clear pattern yet. That's okay. Revisit these questions later, try serving in different areas, and ask trusted believers what strengths they see in you.</p> : results.map((result, index) => (
            <div key={result.key} style={{ marginTop: 14, padding: 15, borderRadius: 15, background: "rgba(255,255,255,.045)", border: "1px solid rgba(214,174,110,.24)" }}>
              <div style={{ color: "#D6AE6E", fontSize: 11, letterSpacing: 1.2, fontWeight: 700 }}> {index === 0 ? "STRONGEST PATTERN" : index === 1 ? "ANOTHER POSSIBILITY" : "ALSO WORTH EXPLORING"} </div>
              <h2 style={{ fontFamily: "Lora, serif", fontSize: 20, margin: "7px 0" }}>{result.title}</h2>
              <p style={{ color: "#E2E3EB", fontSize: 13.5, lineHeight: 1.65, margin: "0 0 8px" }}>{result.desc}</p>
              <div style={{ color: "#B7C0FF", fontSize: 12.5 }}><strong>Kind of gift:</strong> {result.group}</div>
            </div>
          ))}
          <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14 }}>
            <strong style={{ color: "#D6AE6E" }}>A wise next step</strong>
            <p style={{ color: "#C4C9D8", fontSize: 13.5, lineHeight: 1.65 }}>Choose one small way to serve this month. Notice the fruit, seek feedback from mature Christians, and keep testing every impression against Scripture and the character of Jesus.</p>
            <p style={{ color: "#9FA7BC", fontSize: 11.5, lineHeight: 1.55 }}>These gifts come from Ephesians 4, 1 Corinthians 12 and Romans 12. Churches understand some of them differently, so talk it over with your pastor or a mature believer. The results are a starting point, not a confirmation of any ministry office.</p>
          </div>
          <button onClick={restart} style={{ marginTop: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", color: "#F8F4EA", borderRadius: 12, padding: "12px 15px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><RotateCcw size={16}/> Retake questions</button>
        </div>
      </div>
    );
  }

  const indicator = INDICATORS[current.indicator];
  const IndicatorIcon = ICONS[current.indicator];
  const progress = ((step + 1) / total) * 100;

  return (
    <div style={{ minHeight: "100%", padding: 18, color: "#F8F4EA", fontFamily: "Inter, sans-serif", overflowY: "auto" }}>
      <button onClick={onBack} style={{ background: "none", border: 0, color: "#B7C0FF", display: "flex", alignItems: "center", gap: 7, padding: "8px 0", cursor: "pointer" }}><ArrowLeft size={18}/> Back</button>
      <div style={{ ...panel, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: "#D6AE6E", fontSize: 11, fontWeight: 700, letterSpacing: 1.1 }}>
          <span>WHAT ARE YOU GIFTED FOR?</span><span>{step + 1} OF {total}</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.1)", margin: "12px 0 18px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#526cff,#D6AE6E)", borderRadius: 99, transition: "width .2s" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(214,174,110,.12)", border: "1px solid rgba(214,174,110,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}><IndicatorIcon size={21} color="#D6AE6E"/></div>
          <div>
            <div style={{ fontSize: 11, color: "#AAB1C7" }}>QUESTION {step + 1} OF {total}</div>
            <h1 style={{ fontFamily: "Lora, serif", fontSize: 22, lineHeight: 1.2, margin: "4px 0 0" }}>{indicator.title}</h1>
          </div>
        </div>
        <p style={{ color: "#C4C9D8", fontSize: 13.5, lineHeight: 1.6 }}>{indicator.intro}</p>
        <h2 style={{ fontSize: 17, lineHeight: 1.45, margin: "18px 0 12px" }}>{current.q}</h2>
        <div style={{ display: "grid", gap: 9 }}>
          {current.a.map((option, index) => (
            <button key={option[1]} onClick={() => choose(index)} style={button(answers[step] === index)}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", border: answers[step] === index ? "2px solid #A9B3FF" : "1px solid rgba(255,255,255,.28)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {answers[step] === index && <CheckCircle2 size={17} color="#A9B3FF"/>}
                </span>
                <span>{option[1]}</span>
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
