# Minesweeper

Minesweeper, but now you don't have to worry about the thing where at the end you have to guess because the information needed to know where a mine is is simply not available and never will be.

Thanks to elaborate but not excessive constraint satisfaction modeling, now it just fixes the board to a nice one when you're in a position of really truly having to guess.

Also some other nice options, autoplay, showing the deductions on board.


## [Reddit post](https://www.reddit.com/r/Minesweeper/comments/nkab3h/optimistic_minesweeper_ai/):

For a while I've wanted to be able to play Minesweeper without the problem of having to guess at the end of the game. I've seen the versions where no guesses are required, but I built mine a little differently. Instead, here you are guaranteed to open a non-mine on your next click if you're in a position where there is no safe move available (and you click in a place where it's possible that there is no mine given the currently revealed knowledge.)  This is why I'm calling it [Optimistic Minesweeper](https://minesweeper.therestinmotion.com/). If you *really* have to guess, you'll succeed.

In order to introduce this functionality I also effectively built a Minesweeper solver and automatic player.

There are a bunch of potentially interesting options, but I recommend you try the three buttons in the bottom left.
* **Expert Autoplay**: Every tick, the internal "Watcher" reveals all of the squares where it has deduced there can be no mine or makes a guess if it has no useful knowledge to work with. The known mines are red and the known non-mines are green.
* **Expert Autoplay Show Knowledge**: A slightly different view on the internal workings of the watcher. Here the *numbers* show the quantity of neighboring mines that it has *not definitively placed* and the unvisited squares all show a shade of red indicating the calculated probability that they contain a mine. The mine probabilities are used for selecting automatic moves, but are not known with absolute certainty. 
* **User Play Forced Guesses Succeed!**: You get to play a version of minesweeper where any time you're forced to guess, you will always succeed. Note that there have to be absolutely zero provably non-mine squares on the board for this to work. If you found a corner that requires a guess but you can still make progress elsewhere on the board you cannot yet safely make the corner guess. I might change this to be more lenient. :) 
 
Beyond that, feel free to monkey around with the checkboxes and dropdowns providing some (hopefully sufficiently intuitively named) options for board construction and visual behaviour. 

One nice feature is called *autoVisitNeighboursOfFlagSatisfiedNumbers* and automatically runs chords on the whole board after you flag or reveal something. It allows one to open up wide swaths of board by doing nothing more than flagging mines. It gives a slightly different feel compared to normal play and it makes laying down flags feel as powerful as opening up 0s.

Another is *firstMoveAlwaysZero* which just reduces some of the drudgery of handling poor starts.

The heatmap shown by the option *showProbabilityOverlay* is something I've dreamed about, wanting to concretely visualize what it might mean for there to be smooth probabilities for complex Minesweeper constraints satisfiable in many different ways.  

Minesweeper is known to be [NP-Complete](http://web.mat.bham.ac.uk/R.W.Kaye/minesw/ordmsw.htm), so I haven't event tried to generate perfect deductions because I want this to work well in real-time. What I've made works well in practice, even if there are rare situations where it can misjudge a position and autoplay into a mine that is possible to have been known. 

Here's what it looks like in action, displaying what can be inferred from the revealed knowledge.

![Knowledge Overlay][screenshot1]
The overlaid red and green squares correspond to known mines and empties. These constitute most of the normal inferences a player will make while playing Minesweeper. 

![Probability Overlay][screenshot2]
The overlaid red heatmap shows mine probability as evaluated from stochastically generated possible full-board mine configurations. Mine probabilities can be seen by hovering over a square. (The possibility of these being randomly generated with a huge accidental bias can lead to false info but in practice rarely does.)

[screenshot1]: https://minesweeper.therestinmotion.com/screenshot-frontier-deductions.png "Autoplay Making Deductions"
[screenshot2]: https://minesweeper.therestinmotion.com/screenshot-frontier-probabilities.png "Autoplay Inferring Mine Probabilities"

I've learned a lot from this project, particularly from building the "online" inference engine underneath this that provide both deductions and probabilistic guidance. It's a far cry from a full-fledged SAT-solver, but I found that some memories I had from reading about [CryptoMiniSat](https://www.msoos.org/cryptominisat5/) informed my approach. I also learned more about effective play by watching it run. Seeing the locations it plays during a poor opening, making choices at times to play out in the open and other times to play in the neighbourhood of already revealed squares, makes good sense if you think about it for a while. That said, I do not make the claim that the autoplay mode in this plays optimally. It should be very close to optimal, and it plays every safe square that can be potentially inferred in a large majority of cases. 

It succeeds roughly 25% of the time on classic expert settings. I am unsure what the state-of-the-art for minesweeper solvers is on this setting. One of the biggest improvements that could be made is for it to marshal risk strategically. It is only trying to play the next move in a way that minimizes that being the last, even though there can be situations where that is a worse overall strategy than playing locally into a larger risk, but with some guarantee of making progress. I'd be curious to know if anyone else here has thought deeply about how to characterize good strategic risk-taking in the setting of Minesweeper.

I had a good time building this, and I'm happy to share it with you nice people, but it's little more than a toy, lacks features like timing and score-tracking. If it finds much interest from folks, I'd be happy to spend some of my time improving it or documenting it more fully or providing access to the js/typescript sourcecode. As it is, I'm pleased to just leave it here and hope it can bring a little enjoyment to a few Minesweeper enthusiasts.

Thanks. 