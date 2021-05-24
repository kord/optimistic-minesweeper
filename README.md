# Minesweeper

The classic game is back, and now you don't have to worry about all of the shit where at the end you have to guess because the information needed to deduce where a mine is is simply not available and never will be.

Thanks to elaborate but not excessive constraint satisfaction modeling, now it just fixes the board to a nice one when you're in a position of really truly having to guess.

Also some other nice options, autoplay, showing the deductions on board.

I build a web-based Minesweeper clone.

## Reddit post:

For a while I've wanted to be able to play Minesweeper without the problem of having to guess at the end of the game. I've seen the versions where no guesses are required, but I built mine a little differently. In this, you instead are guaranteed to succeed on your next click if you're in a position where there is no safe move available (and you click in a place where it's possible that there is no mine given the currently revealed knowledge.)  This is why I'm calling it [Optimistic Minesweeper](https://minesweeper.therestinmotion.com/).

It also features an autoplay mode, where the mine locations given the state of revealed knowledge can be seen in an overlay and another where the probabilities of mine placement are shown, again given the state of revealed knowledge.

One more nice feature is labelled *autoVisitNeighboursOfFlagSatisfiedNumbers*, and automatically runs chords on the whole board. It gives a slightly different feel and allows one to open up wide swaths of board by nothing more than flagging mines.

Another is *firstMoveAlwaysZero* which just reduces some of the drudgery of handling poor starts.

The heatmap shown by the option *showWatcherMineProbabilities* is something I've dreamed about, wanting to concretely visualize what it might mean for there to be smooth probabilities for complex Minesweeper constraints satisfiable in many different ways.  

Minesweeper is known to be [NP-Complete](http://web.mat.bham.ac.uk/R.W.Kaye/minesw/ordmsw.htm), so I haven't event tried to generate perfect deductions because I want this to work well in real-time. What I've made works well in practice, even if there are rare situations where it can misjudge a position and autoplay into a mine that is possible to have been known. 

Here's what it looks like in action, displaying what can be inferred from the revealed knowledge.

![alt text][screenshot1]
The overlaid red and green squares correspond to known mines and empties. These constitute most of the normal inferences a player will make while playing Minesweeper. 

![alt text][screenshot2]
The overlaid red heatmap shows mine probability as evaluated from stochastically generated possible full-board mine configurations. Mine probabilities can be seen by hovering over a square. (The possibility of these being randomly generated with a huge accidental bias can lead to false info.)

[screenshot1]: https://minesweeper.therestinmotion.com/screenshot-frontier-deductions.png "Autoplay Making Deductions"
[screenshot2]: https://minesweeper.therestinmotion.com/screenshot-frontier-probabilities.png "Autoplay Inferring Mine Probabilities"

I've learned a lot from this project, particularly from building the inference engine underneath this that provide both deductions and statistical guidance in an "online" manner. I also learned a lot about how to play well by watching it run. Seeing the situations in which it plays through a poor opening, making choices at times to play out in the open and other times to play in the neighbourhood of already revealed squares makes good sense if you think about it for a while. That said, I do not make the claim that the autoplay mode in this plays optimally. It should be very close to optimal, and it plays every safe square that can be potentially inferred in a large majority of cases. 

It succeeds roughly 25% of the time on classic expert settings. I am unsure what the state-of-the-art for minesweeper solvers is on this setting. One of the biggest improvements that could be made is for it to marshal risk strategically. It is only trying to play the next move in a way that minimizes that being the last, even though there can be situations where that is a worse overall strategy than playing locally into a larger risk, but with some guarantee of making progress. I'd be curious to know if anyone else here has thought deeply about how to characterize good strategic risk-taking in the setting of Minesweeper.

I had a good time building this, and I'm happy to share it with you nice people, but it's little more than a toy, lacks features like timing and score-tracking. If it finds much interest from folks, I'd be happy to spend some of my time improving it or documenting it more fully or providing access to the js/typescript sourcecode. As it is, I'm pleased to just leave it here and hope it can bring a little enjoyment to a few Minesweeper enthusiasts.

Thanks. 