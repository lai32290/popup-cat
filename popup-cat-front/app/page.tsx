"use client";

import React from "react";
import { services } from "./_service";
import "./styles.css";

export default function Home() {
  const [rank, setRank] = React.useState<{ [key: string]: number }>({});
  const [country, setCountry] = React.useState<string>("");
  const [clickCount, setClickCount] = React.useState(0);
  const countRef = React.useRef(0);
  const clickCounterRef = React.useRef<HTMLHeadElement>();
  const popAudioRef = React.useRef<HTMLAudioElement>();
  const submitRef = React.useRef<NodeJS.Timeout>();
  const [clicked, setClicked] = React.useState(false);

  const log = React.useCallback(async function () {
    if (countRef.current === 0) return;

    services.register.register({ count: countRef.current });
    countRef.current = 0;
  }, []);

  React.useEffect(() => {
    const interval = setInterval(log, 1000 * 10);

    window.addEventListener('beforeunload', log);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', log);
    }
  }, [log]);

  React.useEffect(() => {
    async function getRank() {
      const rank = await services.register.rank();
      setRank(rank.priorityRank);
    }

    async function getUserCountry() {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setCountry(data.country_code);
    }

    const savedClickCount = localStorage.getItem("clickCount");

    if (savedClickCount) {
      setClickCount(Number(savedClickCount));
    }

    getRank();
    getUserCountry();
  }, []);

  function onClick() {
    if (clickCounterRef.current) {
      clickCounterRef.current.classList.remove("animated");
      clickCounterRef.current.offsetWidth;
      clickCounterRef.current.classList.add("animated");
    }

    if (popAudioRef.current) {
      popAudioRef.current.play();
    }

    countRef.current++;
    const next = Number(clickCount) + 1;
    setClickCount(next);
    localStorage.setItem("clickCount", next.toString());
    
    setRank((prev) => {
      const next = { ...prev };
      next[country] = (next[country] || 0) + 1;
      return next;
    });

    if (submitRef.current) {
      clearTimeout(submitRef.current);
    }

    submitRef.current = setTimeout(log, 1000 * 3);
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-between p-24"
      style={{ userSelect: "none" }}
      onClick={onClick}
      onMouseDown={() => setClicked(true)}
      onMouseUp={() => setClicked(false)}
    >
      <h1 className="text-4xl font-bold click-counter" ref={clickCounterRef as any}>{clickCount}</h1>

      <div className="cat-container">
        <img src={`/images/${clicked ? 'open' : 'closed'}.png`} alt="" />
      </div>

      <audio src="/audios/pop.ogg" ref={popAudioRef as any} />

      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold">Rank</h2>
        <ul>
          {Object.entries(rank).map(([key, value]) => (
            <li key={key}>
              {key}: {value}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
