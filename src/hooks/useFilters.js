// ...existing code...
import { useState } from "react";

const DAY_CODE_MAP = {
  MON: "Monday",
  M: "Monday",
  TUE: "Tuesday",
  TU: "Tuesday",
  T: "Tuesday",
  WED: "Wednesday",
  W: "Wednesday",
  THU: "Thursday",
  TH: "Thursday",
  R: "Thursday",
  FRI: "Friday",
  F: "Friday",
  SAT: "Saturday",
  S: "Saturday",
};

const dayCodeToName = (code) => {
  if (!code) return null;
  const k = String(code).trim().toUpperCase();
  if (DAY_CODE_MAP[k]) return DAY_CODE_MAP[k];
  const short3 = k.slice(0, 3);
  const short2 = k.slice(0, 2);
  if (DAY_CODE_MAP[short3]) return DAY_CODE_MAP[short3];
  if (DAY_CODE_MAP[short2]) return DAY_CODE_MAP[short2];
  if (DAY_CODE_MAP[k.slice(0, 1)]) return DAY_CODE_MAP[k.slice(0, 1)];
  return null;
};

const timeStrToMinutes = (t) => {
  if (!t) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (hh === 12) hh = 0;
  if (ap === "PM") hh += 12;
  return hh * 60 + mm;
};

const extractLines = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const parseScheduleLine = (line) => {
  const parts = String(line || "").split(/\s+/).filter(Boolean);
  if (parts.length < 1) return null;
  // extract alphabetic prefix as day token (handles tabs/leading chars)
  const rawToken = (parts[0].toUpperCase().match(/[A-Z]+/) || [parts[0].toUpperCase()])[0];
  const rest = parts.slice(1).join(" ");
  const times = rest.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (!times) {
    return {
      dayCode: rawToken,
      dayName: dayCodeToName(rawToken),
      raw: line,
    };
  }
  const start = timeStrToMinutes(times[1]);
  const end = timeStrToMinutes(times[2]);
  return {
    dayCode: rawToken,
    dayName: dayCodeToName(rawToken),
    start,
    end,
    raw: line,
  };
};

const inferModalityFromText = (text) => {
  const token = String(text || "").trim().toLowerCase();
  if (!token) return null;
  if (token.includes("/")) {
    const parts = token.split("/").map((p) => p.trim());
    const a = parts[0] === "online";
    const b = parts[1] === "online";
    if (a && b) return "online";
    if (a && !b) return "hybrid";
    if (!a && !b) return "f2f";
    if (!a && b) return "hybrid";
  } else {
    if (token.includes("online")) return "online";
    if (token.includes("lec") || token.includes("lab") || token.includes("caseroom") || token.includes("room")) {
      return "f2f";
    }
  }
  return null;
};

export default function useFilters(initial = {}) {
  const [breakBetweenMinutes, setBreakBetweenMinutes] = useState(initial.breakBetweenMinutes ?? "");
  const [excludeDays, setExcludeDays] = useState(initial.excludeDays ?? []); // array of full names
  const [classTypes, setClassTypes] = useState(initial.classTypes ?? []); // ["online","hybrid","f2f"]

  const parseSubjectSchedules = (subject) => {
    const scheduleText = subject.schedule ?? subject.schedules ?? subject.rawSchedule ?? "";
    const lines = extractLines(scheduleText);
    return lines.map(parseScheduleLine).filter(Boolean);
  };

  const computeMinGap = (subject) => {
    const parsed = parseSubjectSchedules(subject);
    const byDay = {};
    parsed.forEach((p) => {
      if (!p || !p.dayCode) return;
      byDay[p.dayCode] = byDay[p.dayCode] || [];
      byDay[p.dayCode].push(p);
    });
    let minGap = Infinity;
    Object.values(byDay).forEach((arr) => {
      const valid = arr
        .map((s) => ({ start: s.start, end: s.end }))
        .filter((x) => typeof x.start === "number" && typeof x.end === "number")
        .sort((a, b) => a.start - b.start);
      for (let i = 1; i < valid.length; i++) {
        const gap = valid[i].start - valid[i - 1].end;
        if (gap < minGap) minGap = gap;
      }
    });
    return minGap === Infinity ? null : minGap;
  };

  // New: robust extraction of day names from schedule text (checks entire schedule string,
  // handles multiple schedule lines and tokens like "TH", "T", "M", "MON", "TUE", etc.)
  const getDaysFromScheduleText = (scheduleText) => {
    const txt = String(scheduleText || "");
    if (!txt.trim()) return [];
    // tokens ordered to match multi-letter tokens first
    const tokens = ["THU","TH","TUE","TUES","TU","T","MON","M","WED","W","FRI","F","SAT","S","R"];
    // build alternation safely
    const alt = tokens.join("|");
    // match tokens as whole-word-ish (allow punctuation/whitespace boundaries)
    const re = new RegExp(`(?:^|[^A-Za-z])(${alt})(?:[^A-Za-z]|$)`, "gi");
    const found = new Set();
    let m;
    while ((m = re.exec(txt)) !== null) {
      const code = (m[1] || "").toUpperCase();
      const name = dayCodeToName(code);
      if (name) found.add(name);
    }
    return Array.from(found);
  };

  const subjectHasAnyExcludeDay = (subject, excludes = []) => {
    if (!excludes || excludes.length === 0) return false;
    const scheduleText = subject.schedule ?? subject.schedules ?? subject.rawSchedule ?? "";
    const days = getDaysFromScheduleText(scheduleText);
    if (!days || days.length === 0) {
      // fallback to parsing per-line (keeps backward compatibility)
      const parsed = parseSubjectSchedules(subject);
      const pDays = parsed.map((p) => p.dayName).filter(Boolean);
      return pDays.some((d) => excludes.includes(d));
    }
    return days.some((d) => excludes.includes(d));
  };

  const inferSubjectModality = (subject) => {
    const candidateFields = [
      subject.modality,
      subject.mode,
      subject.type,
      subject.classType,
      subject.notes,
      subject.rawModality,
      subject.subject_type,
      subject.subject_kind,
      subject.room,
      subject.raw_room,
      subject.schedule,
      subject.subject_title,
      subject.subject_code,
      subject.offering_dept,
      subject.section,
    ];
    for (const c of candidateFields) {
      if (!c) continue;
      const txt = String(c).trim();
      if (!txt) continue;
      const res = inferModalityFromText(txt);
      if (res) return res;
      if (txt.includes("/")) {
        const parts = txt.split("/").map((p) => p.trim().toLowerCase());
        const aOnline = parts[0] === "online";
        const bOnline = parts[1] === "online";
        if (aOnline && bOnline) return "online";
        if (aOnline && !bOnline) return "hybrid";
        if (!aOnline && !bOnline) return "f2f";
        if (!aOnline && bOnline) return "hybrid";
      }
      const low = txt.toLowerCase();
      if (low.includes("online")) return "online";
      if (low.includes("lec") || low.includes("lab") || low.includes("caseroom") || low.includes("room")) return "f2f";
    }
    const sched = subject.schedule ?? subject.schedules ?? "";
    if (String(sched).toLowerCase().includes("online")) return "online";
    return null;
  };

  const toggleExcludeDay = (day) => {
    setExcludeDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day];
    });
  };

  const toggleClassType = (type) => {
    setClassTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      return [...prev, type];
    });
  };

  const filterSubjects = (subjects = []) => {
    const raw = String(breakBetweenMinutes ?? "").trim();
    const enforceBreak = raw !== "";
    const breakVal = enforceBreak ? parseInt(raw, 10) : null;
    if (enforceBreak && Number.isNaN(breakVal)) return [];

    // Debug info removed for security
    if (process.env.NODE_ENV === 'development') {
      console.info("Filtering subjects:", {
          total: (subjects || []).length,
          enforceBreak,
          breakVal,
          excludeDays,
          classTypes,
      });
    }

    return (subjects || []).filter((s) => {
        if (excludeDays.length > 0 && subjectHasAnyExcludeDay(s, excludeDays)) return false;

        if (classTypes.length > 0) {
        const mod = inferSubjectModality(s);
        if (!mod) return false;
        if (!classTypes.includes(mod)) return false;
        }

        if (!enforceBreak) return true;

        const minGap = computeMinGap(s);
        if (minGap === null) return true;
        return minGap >= breakVal;
    });
    /*const breakVal = parseInt(breakBetweenMinutes, 10);
    if (Number.isNaN(breakVal)) return [];
    return (subjects || []).filter((s) => {
      if (excludeDays.length > 0 && subjectHasAnyExcludeDay(s, excludeDays)) return false;
      if (classTypes.length > 0) {
        const mod = inferSubjectModality(s);
        if (!mod) return false;
        if (!classTypes.includes(mod)) return false;
      }
      const minGap = computeMinGap(s);
      if (minGap === null) return true;
      return minGap >= breakVal;
    });*/
  };

  return {
    breakBetweenMinutes,
    setBreakBetweenMinutes,
    excludeDays,
    setExcludeDays,
    toggleExcludeDay,
    classTypes,
    setClassTypes,
    toggleClassType,
    filterSubjects,
    parseSubjectSchedules,
    computeMinGap,
    inferSubjectModality,
  };
}