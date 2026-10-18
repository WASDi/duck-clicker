# Duck Clicker — Gameplay Design

## 1. Core gameplay loop

Duck Clicker is a short idle game in which the player builds a duck empire across three increasingly ridiculous
environments: Pond, Sky, and Space.

The core loop is:

Click ducks → earn Quacks → buy upgrades → hatch more ducks → increase passive income → buy the level's final
upgrade → complete the level.

At one click per second, a typical player finishes Pond in about 3 minutes, Sky in about 4, and Space in about 5
(about 12 minutes in total). A perfect buying order is about 25% faster. Honk Frenzy and Golden Items make it faster
still for active players.

### Core rules

- The game starts directly in the Pond level when the page loads. There is no title screen or menu.
- Each level starts with exactly one duck and zero Quacks.
- Clicking a duck grants **1 Quack plus 5% of the current passive production per second** and plays a "Quack!" sound.
- Quacks are the currency used to purchase upgrades.
- Each level has five upgrades:
    - Four **growth upgrades**, each of which can be bought up to **10 times**. Effects add together with every
      purchase.
    - One **completion upgrade**, which can be bought once. It is much more expensive than the growth upgrades.
- Buying the completion upgrade immediately ends the level and advances the campaign. No other objective must be met.
- Each time a growth upgrade is bought, the next purchase of that same upgrade costs 35% more (rounded to the nearest
  Quack).
- Growth upgrades come in three kinds:
    - **Per-duck production:** generates Quacks per second for every duck in the flock.
    - **Hatchery:** the hatchery has a single timer that starts with the first purchase and repeats at the listed
      interval. Each time it fires, it hatches one duck per purchase (for example, 4 purchases hatch 4 ducks
      together). Buying more does not reset the timer. There is no maximum flock size.
    - **Flat production:** generates a fixed number of Quacks per second regardless of flock size. It is cheap and
      helps most early, before the flock grows.
- Production from all purchases stacks.
- Quacks, ducks, and upgrades reset at the start of each level.
- A progress bar on screen shows current spendable Quacks toward the cost of the completion upgrade, so a full bar
  always means "you can buy it now". The bar drops when Quacks are spent.

### Honk Frenzy

Clicking ducks 8 times within any 6-second window activates Honk Frenzy: all passive production doubles for 10
seconds. Only duck clicks count. Clicks while Frenzy is active or cooling down don't count toward the next one. Honk
Frenzy can be activated again 20 seconds after it ends.

While Frenzy is active, everything based on passive production uses the doubled value: the click bonus (5% of
production) and the Golden Item reward.

### Golden Items

A golden item floats across the screen for 6 seconds: Golden Bread in Pond, Golden Cloud in Sky, and Golden Star in
Space. The first one appears 40 to 60 seconds after the level starts, and each next one 40 to 60 seconds after the
previous one leaves the screen. Clicking it grants 8 seconds' worth of current passive production (minimum 15 Quacks).

## 2. Level One — Pond

A lone duck lives beside a pond. It needs bread, friends, and a reliable feeding operation before it can establish the
world's first Duck Republic.

The player begins with one duck and zero Quacks and clicks the duck to earn Quacks. The first upgrade can be bought
after about 10 seconds of clicking.

The ducks occasionally move around the pond.

### Upgrades

| Upgrade        | Type       | Base cost | Effect per purchase                    | Max buys |
|----------------|------------|-----------|----------------------------------------|----------|
| Bread Conveyor | Per-duck   | 10        | +0.25 Quacks/s per duck                | 10       |
| Reed Nursery   | Hatchery   | 35        | Hatches one duck every 14 seconds      | 10       |
| Duckweed Farm  | Per-duck   | 100       | +0.4 Quacks/s per duck                 | 10       |
| Worm Shower    | Flat       | 25        | +2 Quacks/s                            | 10       |
| Flight         | Completion | 3,800     | Sends the flock flying up into the sky | 1        |

Buying Flight launches the flock upward into the sky and immediately starts the Sky level. The pond celebrates the
successful bread operation.

## 3. Level Two — Sky

The flock discovers that the sky contains an almost unlimited supply of cloud crumbs. Unfortunately, feeding ducks at
altitude requires better engineering.

The level begins with one duck sitting on a cloud and zero Quacks. Ducks, Quacks, and Pond upgrades do not carry over.

Ducks either sit on clouds or fly around. Ducks occasionally jump between clouds.

### Upgrades

| Upgrade              | Type       | Base cost | Effect per purchase               | Max buys |
|----------------------|------------|-----------|-----------------------------------|----------|
| Cloud Crumb Cannon   | Per-duck   | 20        | +0.3 Quacks/s per duck            | 10       |
| Cloud Incubator      | Hatchery   | 65        | Hatches one duck every 13 seconds | 10       |
| V-Formation Training | Per-duck   | 200       | +0.45 Quacks/s per duck           | 10       |
| Insect Swarm Net     | Flat       | 40        | +3 Quacks/s                       | 10       |
| Stratosphere Gate    | Completion | 7,700     | Opens a route to Space            | 1        |

Buying the Stratosphere Gate immediately starts the Space level. The ducks establish an aerial migration route.

## 4. Level Three — Space

The ducks have conquered water and air. Their final ambition is to establish the first interstellar duck civilization
and prove that the universe belongs to the flock.

The level begins with one duck and zero Quacks. Ducks, Quacks, and Sky upgrades do not carry over.

Astronaut ducks hover around in space.

### Upgrades

| Upgrade                 | Type       | Base cost | Effect per purchase               | Max buys |
|-------------------------|------------|-----------|-----------------------------------|----------|
| Starseed Feeder         | Per-duck   | 30        | +0.35 Quacks/s per duck           | 10       |
| Zero-G Egg Pod          | Hatchery   | 90        | Hatches one duck every 12 seconds | 10       |
| Orbital Duckweed Garden | Per-duck   | 280       | +0.5 Quacks/s per duck            | 10       |
| Quasar Core             | Flat       | 60        | +4 Quacks/s                       | 10       |
| Galactic Beacon         | Completion | 12,000    | Completes the campaign            | 1        |

Buying the Galactic Beacon ends the campaign and starts the outro.

## 5. Campaign-wide progression

| Mechanic                | Pond       | Sky        | Space       |
|-------------------------|------------|------------|-------------|
| Growth upgrades         | 4          | 4          | 4           |
| Target duration         | 3 min      | 4 min      | 5 min       |
| Completion upgrade cost | 3,800      | 7,700      | 12,000      |
| Hatch interval          | 14 s       | 13 s       | 12 s        |
| Per-duck production     | 0.25 / 0.4 | 0.3 / 0.45 | 0.35 / 0.5  |
| Flat production per buy | +2/s       | +3/s       | +4/s        |
| Main theme              | Feeding    | Flight     | Exploration |

## 6. Ending

When the Galactic Beacon is bought, the outro plays. This section is the single source for what happens in the outro.
`Audio.md` gives the music for each scene and `Graphics.md` gives how it is drawn; both follow these scenes and times.
The outro is 68 seconds long and cannot be skipped.

| Time      | Scene                                                                                                         |
|-----------|---------------------------------------------------------------------------------------------------------------|
| 0:00–0:06 | **1. Ignition.** The Beacon lights up and fires a beam of golden light into deep space. The screen shakes as the flock's quacking swells into a chorus. |
| 0:06–0:20 | **2. The flight.** The flock launches along the beam in V-formation, passing the Quasar Core, the Orbital Duckweed Garden, and the Starseed Feeder. |
| 0:20–0:32 | **3. Landfall.** The flock lands on a small blue moon with a glowing pond. The first (White) duck waddles to the water's edge, plants a tiny flag, and quacks once. |
| 0:32–0:46 | **4. The colony.** Ducklings hatch from glowing eggs, lily-pad domes light up, and the flock splashes into the moon's pond. |
| 0:46–0:58 | **5. Pull-back.** The camera travels back through space and sky to the original Pond, where a single piece of bread floats on the water. |
| 0:58–1:08 | **6. Final message.** The screen fades to black and displays: "One small quack for a duck. One giant waddle for duckkind." |
