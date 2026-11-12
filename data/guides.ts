export type GuideSection = { heading: string; paragraphs: string[] };
export type Guide = { slug: string; title: string; description: string; lede: string; sections: GuideSection[] };

/** Paragraphs may contain internal links written as [label](/path). */
export const guides: Guide[] = [
  {
    slug: "which-side",
    title: "Which side of the train to sit on",
    description: "How to choose a side of the carriage for a scenic railway: coast, mountains, sun, and the lines where it does not matter.",
    lede: "A window seat is worth more than the 'right' window. On some lines one side still has the view for an hour at a time, and on others the valley swaps sides every few minutes.",
    sections: [
      { heading: "Start with the geography, not a blog's diagram", paragraphs: [
        "The useful question is what you are trying to see, and which way that thing lies from the track. The sea is on the seaward side of a coast line. A mountain wall sits on the uphill side of a valley line. A famous bridge or a waterfall is a point, and it will be on your left or your right for a minute, not for the whole journey.",
        "Direction of travel flips the answer. 'Sit on the left' is meaningless until you know whether the train is going to Mallaig or coming back. The route guides on this site name the direction they mean. If a page says the peaks are on your left toward Jogindernagar, the return journey puts them on your right.",
      ] },
      { heading: "Lines where one side is actually better", paragraphs: [
        "On the [Konkan Railway](/routes/konkan) the Arabian Sea is to the west. Southbound, that is your right; northbound, your left. The track spends much of the day a little inland, so the sea is not a continuous view, but the estuaries and the Goa coast still favour that side.",
        "On the [Kangra Valley Railway](/routes/kangra-valley) the Dhauladhar stands to the north of the line. Toward Jogindernagar the peaks are mostly on your left. On the [West Highland Line](/routes/west-highland), once you are past Fort William and heading for Mallaig, the islands and the beaches are mostly on your left, which is the west.",
        "These are tendencies. Curves still hand the view to the other window for a while. They are useful if you are choosing one seat at the start and will not move.",
      ] },
      { heading: "Lines where the side barely matters", paragraphs: [
        "Hill railways that gain height with loops and reverses show the valley to both windows, often within the same half hour. The [Darjeeling Himalayan Railway](/routes/darjeeling), the [Nilgiri Mountain Railway](/routes/nilgiri) and the [Kalka–Shimla Railway](/routes/kalka-shimla) are all like this. A window seat matters. Which window matters less, and a diagram that awards the whole climb to one side is wrong.",
        "The same is true of a narrow valley. On the [Flåm Railway](/routes/flam) the cliffs and waterfalls appear on both sides, and a tunnel that turns the train around swaps them anyway. The train stops at Kjosfossen, so that particular waterfall does not depend on your seat. On the [Bernina Express](/routes/bernina-express) the panoramic glass, and the fact that the train curves through a full circle at Brusio, make a bad side less costly than it would be in an ordinary coach.",
        "Across an open plateau such as the Hardangervidda on the [Bergen Line](/routes/bergen-line), both sides see the same emptiness. Spend your effort getting a window at all for the high section, not on picking left versus right for seven hours.",
      ] },
      { heading: "Sun, glass and the person in front of you", paragraphs: [
        "Morning sun in the east and evening sun in the west will glare off the glass for an hour and then leave that side in shade. On a south-facing coast this can matter more than the scenery. If you are photographing, the shaded window is often the better one, because you are not shooting through a reflection of the carriage.",
        "Curved panoramic glass, as on the Glacier Express and the Bernina Express, reflects more than a flat window. Shooting at an angle, rather than straight out, reduces the reflection. A dirty or sealed window is a worse problem than sitting on the slightly less good side, and you cannot fix it except by moving.",
        "If the seat beside the window is taken, the aisle seat on a full scenic train is a seat with no view. On unreserved trains, boarding at the terminus is the reliable way to get the window. On reserved trains, the seat map is the decision, and it is worth making when you book rather than in the vestibule.",
      ] },
      { heading: "How this site calls left and right", paragraphs: [
        "The live map does not use a fixed left and right for a whole route. It works out which side a landmark is on from the direction the train is travelling at that point along the track. A fort that is on your left before a loop can be on your right after it. That is the same thing you experience from the carriage, which is why a single 'best side' so often disappoints.",
        "The details of how the map decides, including when the position is only a timetable estimate, are in [how the live map works](/guides/how-the-map-works).",
      ] },
    ],
  },
  {
    slug: "how-the-map-works",
    title: "How the live map decides what you are passing",
    description: "What Scenic Rails means by left and right, a live position, a timetable estimate, and a stretch drawn approximately.",
    lede: "The map is a model of the journey, built from public railway and map data. It is specific about what it knows, and it says so when a stretch or a position is only an estimate.",
    sections: [
      { heading: "What you searched for", paragraphs: [
        "A train number is looked up in the country you picked. In India that is a number such as 12951. Elsewhere it is something like ICE 371 or GR5220, and you can add @ and a station if the train needs a hint about where to find it. If what you typed is not a train number, it is read as a list of stations separated by commas, and the route is drawn through those stations in order.",
        "The country picker changes where the search looks. A number that is a train in India is not looked up in Germany, and a German train number is not looked up on Indian Railways. The date, when you are searching a train, is the day the journey started, which matters for an overnight train you are still on the next morning.",
      ] },
      { heading: "The line on the map", paragraphs: [
        "The first line you see is there so the trip is on screen quickly. Where the site can match that line to real railway track, it replaces the rough drawing with the track. Where it cannot, the stretch stays as a simpler line between the points it does know, and the bar along the top counts those kilometres as drawn approximately, because there was no track data.",
        "An approximate stretch is still in the right part of the country, and the stations on it are the stations from the timetable or from your list. It is not a promise that the train follows that exact path through a town. Bridges, tunnels and the side of a river can be wrong on those kilometres. The landmarks for that part of the ride are less trustworthy for the same reason: they were searched along a line that may sit beside the real railway rather than on it.",
      ] },
      { heading: "Left, right, and where you are", paragraphs: [
        "Left and right are from the train, not from the way your phone is held. The site walks the line in the direction of travel, places the train at a distance along that line, and asks which side of that moving point each landmark falls on. Turn the phone, and the labels do not swap. Turn the train around at a reversing station, and they do, because the direction of travel changed.",
        "That distance along the line comes from one of three places. If you are using the ride view, it follows progress along the route. If the train has a position, it uses that. Otherwise you can scrub the timeline yourself and the map shows what would be alongside at that kilometre. The counts on 'on your left' and 'on your right' are the landmarks near that point, leaving out things that the line simply crosses, such as a river the train goes over rather than passes beside.",
        "A landmark is kept if it sits within a few kilometres of the line, a little further out for the larger ones. The names and the short descriptions come from Wikipedia, Wikimedia Commons and OpenStreetMap, and in India also from Bharat Atlas. They are a prompt for what is outside the window, not a surveyed guide, and the page links back to the source when there is one. [Which side to sit on](/guides/which-side) is the longer version of the seat question; the map is the version that changes as you move.",
      ] },
      { heading: "A reported position and a timetable estimate", paragraphs: [
        "When a train is running, the dot on the map is either a position reported for that train or an estimate from the timetable. The estimate takes how far the train should have got by now, given the stops and the times, and places it that far along the line. It does not know about an unscheduled halt. If the train is held outside a station, the estimate can walk on without it.",
        "The map says when it is estimating. A reported position, where one is available, replaces the estimate and is kept for a few minutes so the dot is not jumping between the two on every refresh. After that the automatic updates go back to the timetable until the next reported fix. Outside India, the reported times come from the open timetable feed for that trip, and only when the search actually found the trip. No trip means no live dot, even if the route itself was found from the map data.",
        "Stations along the route are marked with the times the timetable gave, and with a reported time when the feed has one. A green or amber difference is that report compared with the schedule. It is only as current as the last successful refresh. If the updates fail, the bar tells you how long ago the position was last refreshed rather than pretending it is live.",
      ] },
      { heading: "What to trust, and what to check elsewhere", paragraphs: [
        "Use the map to know which side of the carriage to look, and to learn the name of a fort, a river or a town as you pass it. Use a railway's own site before you travel if you need a departure time, a platform, or a guarantee that the train is running. Timetables change, live feeds drop out, and a landmark's description can be years out of date.",
        "The route guides are the slower, written version of the same idea: what the journey is, when to go, and which side is worth booking. The map is what you open once you are on the train. They do not always agree in the small details, because the guides were written about the line and the map is assembled from the data available on the day you search.",
      ] },
    ],
  },
];
