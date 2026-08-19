# Verse Clash

A party game. Each Room is played in one Mode: Classic, Mad Libs, or Grand.

## Language

**Room**:
A single game session people join by a short code.
_Avoid_: match, lobby (the place is Lobby)

**Mode**:
Which way a Room is played, chosen when the Room is created and never changed on that Room: Classic, Mad Libs, or Grand.
_Avoid_: variant, version, round type

**Classic**:
The Mode where Teams fill a shared piece from hidden word choices, then reveal it and vote a Crowd Favorite.

**Mad Libs**:
The Mode where Teams fill the same hidden story from blank cues, then reveal it and vote a Crowd Favorite.
_Avoid_: MadLibs, madlibs

**Grand**:
The Mode with no Teams and no Crowd Favorite: one Room-wide story filled by every player except the Host.

**Migrate**:
The Host move that Ends this Room and opens a new Room in another Mode, taking the current players with it. The Ended Room forwards anyone who returns.
_Avoid_: switch mode, fork, transfer

**Lobby**:
The main room. People leave it for a Breakout only during Selecting in Classic and Mad Libs.
_Avoid_: Gathering, waiting area, lobby as a Phase

**Breakout**:
The team side-room for Selecting in Classic and Mad Libs. Grand has none.
_Avoid_: team room, in progress (as the place name)

**Phase**:
The current activity in a Room: Gathering, Prompt, Selecting, Reveal, Voting, Standings, or Ended. Prompt is Classic only; Voting and Standings do not occur in Grand.
_Avoid_: status, assembling, lobby (as an activity)

**Gathering**:
The Phase in the Lobby before the host starts a round. People join; Teams are not assigned yet unless the host seats someone.
_Avoid_: lobby, waiting

**Prompt**:
The Classic-only Phase in the Lobby when everyone reads the same authored prompt.
_Avoid_: prompt reveal, prompt_reveal

**Selecting**:
The Phase when seated players fill their Slots.
_Avoid_: choosing, team room

**Slot**:
A labeled blank filled during Selecting. Each Slot has a word type (description, thing, something important, or action).
_Avoid_: blank, category, hole

**Fill**:
A word a seated player submits for one Slot during Selecting.
_Avoid_: pick, choice, submission, word request

**Verse**:
The Classic piece shown at Reveal, written from a Team's Fills.
_Avoid_: composition, story (that's Mad Libs / Grand)

**Reveal**:
The Phase in the Lobby when the filled story is shown.
_Avoid_: assembling

**Voting**:
The Phase in the Lobby when players pick a Crowd Favorite. Grand has no Voting.

**Standings**:
The Phase in the Lobby when Team win counts are shown after a vote. Grand has no Standings.

**Ended**:
The Phase when the game is over. The Host can start a new game in the same Room or Migrate.

**Host**:
The player who starts a round, ends this round, ends the game, starts a new game, or Migrates, and is never on a Team.
_Avoid_: operator, moderator

**Team**:
A named crew that keeps the same people across rounds and holds a Crowd Favorite win count. Grand has no Teams.
_Avoid_: side, group

**Crowd Favorite**:
The single vote that awards a Team a win for the round.
_Avoid_: score, points
