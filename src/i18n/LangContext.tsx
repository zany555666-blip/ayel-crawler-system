"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { zh, en } from "./dict";

type Lang = "zh" | "en";
type Dict = typeof zh;

interface LangContextType {
  lang: Lang;
  t: Dict;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: "zh",
  t: zh,
  toggleLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("supplyai-lang");
    if (saved === "en" || saved === "zh") setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === "zh" ? "en" : "zh";
      localStorage.setItem("supplyai-lang", next);
      return next;
    });
  };

  return (
    <LangContext.Provider value={{ lang, t: lang === "zh" ? zh : en, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
