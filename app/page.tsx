"use client";

import { useEffect, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MatrixRain from "@/components/MatrixRain";
import PostHogInit from "@/components/PostHogInit";
import Tagline from "@/components/Tagline";
import { I18nProvider } from "@/lib/i18n";

export default function Home() {
  const [allowAdult, setAllowAdult] = useState(false);

  useEffect(() => {
    setAllowAdult(localStorage.getItem("wgtb.allowAdult") === "1");
  }, []);

  const handleAllowAdultChange = (value: boolean) => {
    setAllowAdult(value);
    localStorage.setItem("wgtb.allowAdult", value ? "1" : "0");
  };

  return (
    <I18nProvider>
      <PostHogInit />
      <MatrixRain />
      <div className="flex min-h-dvh flex-col">
        <Header allowAdult={allowAdult} onAllowAdultChange={handleAllowAdultChange} />
        <main className="flex flex-1 flex-col items-center justify-center px-3 pb-6 pt-2 sm:px-6">
          <Tagline />
          <ChatWindow allowAdult={allowAdult} />
        </main>
        <Footer />
      </div>
    </I18nProvider>
  );
}
