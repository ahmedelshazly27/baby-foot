# How the rating works

## What ELO is

**ELO** is a number that estimates how strong a player is by comparing them to
everyone they've played. When the expected winner wins, ratings barely move;
when the underdog wins, the swing is much bigger.

## Team ratings

Every player carries their own ELO. For a 2v2 match we need a team number for
the math, so we take the simple average of the two teammates' individual
ratings. That's the number the win-probability formula compares. Whatever the
team gains or loses is then credited to each teammate separately — both
players on the winning side move by the same amount, and the same is true for
the losing side.

## Winners' gain doesn't equal losers' loss

Classic ELO is zero-sum: one rating goes up by exactly what the other goes
down. We deliberately break that here, for a fairness reason: the *speed*
each player's rating moves depends on how many games they've played (their
**K-factor**, below), and we average the K-factor per team. A rookie's K is
bigger than a veteran's K, so if two rookies play two veterans, the rookies'
side will swing harder than the veterans' side. That's the point — it lets
newcomers settle in quickly without yanking established ratings around.

## What K-factor is

**K-factor** is the "volume knob" on how much a single match can move a
rating. Bigger K, bigger moves. We use three tiers by games played:

- **Under 10 games:** K = 40 (provisional — get you into roughly the right
  bracket fast).
- **10 – 30 games:** K = 24.
- **30 + games:** K = 16 (established — ratings become sticky).

## Score margin

A 10–0 sweep should say more than a 10–9 nail-biter. We multiply the swing by
`ln(goal_diff + 1) / ln(11)`. A 10–0 ends up at `1.00` (full swing). A 10–9
ends up at `≈ 0.29` (small swing).

## Worked example

Alex (1320, 40 games) and Blair (1280, 25 games) play Casey (1150, 8 games)
and Dana (1210, 12 games). Alex & Blair win **10–4**.

1. Team averages: Alex/Blair = **1300**, Casey/Dana = **1180**.
2. Expected win for Alex/Blair = 1 / (1 + 10^((1180-1300)/400)) ≈ **0.666**.
3. Margin multiplier for 10–4 (goal_diff = 6): `ln(7)/ln(11) ≈ 0.811`.
4. Alex/Blair's team K = average(16, 24) × 0.811 = 20 × 0.811 ≈ **16.23**.
5. Casey/Dana's team K = average(40, 24) × 0.811 = 32 × 0.811 ≈ **25.97**.
6. Alex/Blair delta = 16.23 × (1 − 0.666) ≈ **+5.42** each.
7. Casey/Dana delta = 25.97 × (0 − 0.334) ≈ **−8.67** each.

Casey and Dana lose more than Alex and Blair gain — precisely because Casey
is provisional. The ladder absorbs the difference.
