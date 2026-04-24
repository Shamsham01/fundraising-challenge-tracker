import { describe, it, expect } from "vitest";
import { buildLeaderboard, selectAutomaticWinner } from "../leaderboard";

describe("leaderboard", () => {
  it("ranks by score and breaks ties with earlier join", () => {
    const lb = buildLeaderboard(
      [
        {
          userId: "a",
          displayName: "A",
          score: 10,
          joinedAt: new Date("2025-01-02"),
        },
        {
          userId: "b",
          displayName: "B",
          score: 10,
          joinedAt: new Date("2025-01-01"),
        },
        {
          userId: "c",
          displayName: "C",
          score: 5,
          joinedAt: new Date("2025-01-01"),
        },
      ],
      "total_distance",
    );
    expect(lb[0]!.userId).toBe("b");
    expect(lb[1]!.userId).toBe("a");
    expect(lb[2]!.userId).toBe("c");
  });

  it("picks first ranked as winner", () => {
    const lb = buildLeaderboard(
      [
        { userId: "x", displayName: "X", score: 3, joinedAt: new Date() },
        { userId: "y", displayName: "Y", score: 1, joinedAt: new Date() },
      ],
      "total_distance",
    );
    const w = selectAutomaticWinner(lb);
    expect(w?.userId).toBe("x");
  });
});
