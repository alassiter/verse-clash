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

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Panel>
        <h2 className="mb-4 text-3xl font-bold">Create a room</h2>
        <label className="mb-2 block text-lg">Your display name</label>
        <input
          className="mb-4 w-full rounded-2xl border border-stone-300 px-4 py-4 text-xl"
          value={hostName}
          onChange={(event) => setHostName(event.target.value)}
        />
        <BigButton
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
      <Panel>
        <h2 className="mb-4 text-3xl font-bold">Join with a code</h2>
        <label className="mb-2 block text-lg">Room code</label>
        <input
          className="mb-4 w-full rounded-2xl border border-stone-300 px-4 py-4 text-xl uppercase"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <label className="mb-2 block text-lg">Display name</label>
        <input
          className="mb-4 w-full rounded-2xl border border-stone-300 px-4 py-4 text-xl"
          value={joinName}
          onChange={(event) => setJoinName(event.target.value)}
        />
        <BigButton
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
      {error ? <p className="text-xl text-red-700 md:col-span-2">{error}</p> : null}
    </div>
  );
}
