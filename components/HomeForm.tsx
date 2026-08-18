"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoomAction, joinRoomAction } from "@/app/actions/room";
import { BigButton, Panel } from "@/components/ui";

export function HomeForm() {
  const router = useRouter();
  const [hostName, setHostName] = useState("Alex");
  const [joinName, setJoinName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "mb-4 w-full rounded-2xl border-2 border-comic-ink bg-white px-4 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-comic-red";

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Panel tone="red" title="Create a room">
        <label className="mb-2 block text-lg">Your display name</label>
        <input
          className={inputClass}
          value={hostName}
          onChange={(event) => setHostName(event.target.value)}
        />
        <BigButton
          tone="primary"
          className="w-full"
          onClick={() => {
            void createRoomAction(hostName).then((result) => {
              if (!result.ok) {
                setError(result.error);
                return;
              }
              window.localStorage.setItem("verse-clash-room", result.roomCode);
              router.push(`/room/${result.roomCode}/host`);
            });
          }}
        >
          Create room
        </BigButton>
      </Panel>
      <Panel tone="blue" title="Join with a code">
        <label className="mb-2 block text-lg">Room code</label>
        <input
          className={`${inputClass} uppercase`}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <label className="mb-2 block text-lg">Display name</label>
        <input
          className={inputClass}
          value={joinName}
          onChange={(event) => setJoinName(event.target.value)}
        />
        <BigButton
          tone="secondary"
          className="w-full"
          onClick={() => {
            void joinRoomAction(code, joinName).then((result) => {
              if (!result.ok) {
                setError(result.error);
                return;
              }
              window.localStorage.setItem("verse-clash-room", result.roomCode);
              router.push(`/room/${result.roomCode}`);
            });
          }}
        >
          Join room
        </BigButton>
      </Panel>
      {error ? (
        <p className="rounded-2xl border-2 border-comic-ink bg-comic-cream px-4 py-3 text-xl font-semibold text-comic-red md:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
