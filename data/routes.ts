import type { Stop } from "@/lib/rail";
export type Sight = { name: string; at: [number, number]; text: string; tip?: string; img?: string; url?: string };
export type Section = { heading: string; paragraphs: string[] };
export type Route = { slug: string; name: string; place: string; region: string; distance: string; duration: string; blurb: string; line: [number, number][]; sights: Sight[]; stops?: Stop[]; article?: Section[] };
// Coordinates are [lng, lat] and hand-simplified. For exact track geometry, export railway=rail ways from OpenStreetMap (Overpass) and replace `line`.
export const routes: Route[] = [
  { slug: "konkan", name: "Konkan Railway", place: "Maharashtra to Karnataka, India", region: "India", distance: "about 740 km", duration: "about 12 hours",
    blurb: "A coastal line threading tunnels and river bridges between the Western Ghats and the Arabian Sea.",
    line: [[73.11,18.99],[73.12,18.44],[73.52,17.53],[73.30,16.99],[73.71,16.27],[73.96,15.27],[74.12,14.81],[74.32,14.55],[74.49,14.09],[74.75,13.34],[74.85,12.91]],
    sights: [
      { name: "Ganpatipule coast", at: [73.27,17.15], text: "A quiet white-sand beach below a seaside temple, a short drive from Ratnagiri.", tip: "Get off at Ratnagiri and take a taxi for about an hour." },
      { name: "Sindhudurg Fort", at: [73.46,16.06], text: "A 17th-century sea fort on a rock island off Malvan.", tip: "Boats leave from Malvan jetty; allow half a day." },
      { name: "Palolem beach", at: [74.02,15.01], text: "A crescent bay in south Goa with calm water and palm-lined sand.", tip: "Get off at Canacona, about 5 km away." },
      { name: "Gokarna beaches", at: [74.31,14.52], text: "Cliff-backed beaches such as Kudle and Om, reached by a coastal trek or short ride.", tip: "Gokarna Road station is the closest stop." },
      { name: "Murudeshwar", at: [74.49,14.09], text: "A giant Shiva statue and temple on a headland, visible from the train as you pass.", tip: "The station is right beside the temple town." } ],
    article: [
      { heading: "A railway that was once thought impossible", paragraphs: [
        "For most of the twentieth century, the Konkan coast between Mumbai and Mangaluru had no direct railway. The strip of land between the Western Ghats and the Arabian Sea is cut by dozens of rivers, steep laterite ridges and soft, waterlogged soil, and travellers depended on coastal steamers, slow buses and long detours inland.",
        "The Konkan Railway changed that. Built through the 1990s and opened along its full length in 1998, the line runs roughly 740 km from Roha in Maharashtra, through Goa, to Thokur near Mangaluru in Karnataka. Engineers drove close to a hundred tunnels and well over a thousand bridges to keep the track as level and straight as the terrain allowed, which is why so much of the journey alternates between darkness and sudden, wide views across river mouths and paddy fields.",
      ] },
      { heading: "What you see from the window", paragraphs: [
        "North of Ratnagiri the landscape is red earth, mango and cashew orchards, and small villages with tiled roofs. The train crosses broad estuaries on long, low bridges, and on clear mornings you can see fishing boats drawn up on the mud flats below.",
        "Further south the line passes through some of its longest tunnels, including the Karbude tunnel near Ratnagiri, one of the longest railway tunnels in India. Between tunnels you get glimpses of deep green valleys and, during the monsoon, waterfalls running straight off the cliffs beside the track.",
        "In Goa the scenery softens into coconut palms, white churches and wide rivers such as the Mandovi and Zuari. Beyond Karwar the hills come right down to the sea, and near Murudeshwar the giant statue on the headland is visible from the train.",
      ] },
      { heading: "When to go", paragraphs: [
        "The monsoon, roughly June to September, is the most dramatic time to ride. The hills turn a vivid green, rivers swell and waterfalls appear everywhere. Trains run on a slower monsoon timetable for safety, so the journey takes longer, and occasional landslides can cause delays.",
        "October to February brings clear skies and cooler weather, which is better if you plan to get off and visit beaches and forts along the way. March to May is hot and humid on the coast, and the hills look dry and brown.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "The sea is to the west, so on a southbound train it is on your right and on a northbound train it is on your left. In practice the line runs a little inland for most of its length, and the best views are of rivers, estuaries and valleys, which appear on both sides. If you only get one choice, take the sea side for the Goa and Karnataka stretches.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Most travellers ride a section rather than the whole line. Mumbai to Madgaon in Goa is the most popular stretch and takes most of a day. Several daytime trains on this section offer reserved chair-car seats, and some services carry glass-roofed Vistadome coaches designed for sightseeing; book these early because they sell out quickly.",
        "Overnight trains cover the full route but pass the best scenery in the dark, so choose a daytime train if the views are the point of the trip. Carry water and snacks; station stops are short and the pantry service varies between trains.",
      ] },
    ] },
  { slug: "glacier-express", name: "Glacier Express", place: "Zermatt to St. Moritz, Switzerland", region: "Switzerland", distance: "about 290 km", duration: "about 8 hours",
    blurb: "A slow panoramic train crossing 91 tunnels and 291 bridges through the Swiss Alps.",
    line: [[7.75,46.02],[7.88,46.29],[7.99,46.32],[8.35,46.54],[8.59,46.63],[8.67,46.66],[8.85,46.70],[9.20,46.77],[9.40,46.84],[9.53,46.85],[9.68,46.69],[9.87,46.54],[9.84,46.50]],
    sights: [
      { name: "Matterhorn from Zermatt", at: [7.658,45.976], text: "The pyramid peak that defines the Alps, best seen in the morning light from town.", tip: "Spend a night in Zermatt before boarding." },
      { name: "Oberalp Pass", at: [8.67,46.66], text: "The highest point of the route, with snowfields and a frozen lake in winter.", tip: "Keep your camera ready as the train crests the pass." },
      { name: "Rhine Gorge", at: [9.30,46.82], text: "Pale limestone cliffs above the young Rhine, often called Switzerland's Grand Canyon.", tip: "Look down from the windows after Ilanz." },
      { name: "Landwasser Viaduct", at: [9.678,46.676], text: "A curved stone viaduct leaving a cliff tunnel, 65 m above the valley.", tip: "Photograph it from the viewing path near Filisur." } ],
    article: [
      { heading: "The slowest express in the world", paragraphs: [
        "The Glacier Express has linked Zermatt and St. Moritz since 1930. It calls itself the slowest express train in the world, and the name is meant as a promise: the train takes about eight hours to cover roughly 290 km, climbing over mountain passes and winding through gorges on metre-gauge track.",
        "Two railways share the route. The Matterhorn Gotthard Bahn runs the western half from Zermatt over the Oberalp Pass, and the Rhaetian Railway runs the eastern half through Graubünden to St. Moritz. Along the way the train crosses about 291 bridges and passes through 91 tunnels.",
      ] },
      { heading: "The journey, stage by stage", paragraphs: [
        "Leaving Zermatt, the train runs down the narrow Mattertal valley to Visp, then follows the Rhône upstream through the Goms valley, a string of dark wooden villages beneath high peaks.",
        "The climb to the Oberalp Pass, at about 2,033 m, is the highest point of the trip. In winter the pass is deep in snow; in summer the small Oberalp lake sits beside the line. The descent leads to Disentis and then into the Rhine Gorge, where the young river has cut through pale limestone left by a prehistoric rockslide.",
        "After Chur the train joins the Albula line, part of a UNESCO World Heritage Site together with the Bernina line. This is where the engineering is most spectacular: spiral tunnels that loop the track back over itself, and the Landwasser Viaduct, a curved stone bridge about 65 m high that runs straight into a tunnel in a cliff face.",
      ] },
      { heading: "When to go", paragraphs: [
        "The train runs all year. Summer brings green meadows, wildflowers and long daylight, while winter turns the whole route white and the Oberalp section feels remote and wild. Late spring and autumn are quieter and cheaper, though some mountain facilities close between seasons. Check the timetable before you plan: there is usually a short break in service in late autumn for maintenance.",
      ] },
      { heading: "Tickets and seats", paragraphs: [
        "A seat reservation is compulsory on the Glacier Express and is charged on top of the fare. Rail passes such as the Swiss Travel Pass cover the fare but not the reservation. The panoramic carriages have windows that curve up into the roof, so you see the peaks above as well as the valleys below. Premium seats with larger window views are available at a higher price.",
        "Meals can be served at your seat. If you prefer to break the journey, you can ride individual sections on regular regional trains, which do not need a reservation and let you get off at places like Andermatt or Filisur.",
      ] },
      { heading: "Tips for the best views", paragraphs: [
        "Spend a night in Zermatt before boarding so you can see the Matterhorn in the early morning light. Travelling eastbound from Zermatt saves the Albula line and the Landwasser Viaduct for the afternoon. Keep your camera ready after Filisur and just before Oberalp, and remember that glare on the curved windows is less of a problem if you shoot at an angle.",
      ] },
    ] },
  { slug: "kalka-shimla", name: "Kalka–Shimla Railway", place: "Haryana to Himachal Pradesh, India", region: "India", distance: "96 km", duration: "about 5 hours",
    blurb: "A narrow-gauge hill railway climbing through pine forests, tunnels and arched stone bridges.",
    line: [[76.94,30.84],[77.01,30.88],[77.09,30.91],[77.12,30.96],[77.17,31.10]],
    sights: [
      { name: "Barog tunnel", at: [77.00,30.88], text: "One of the longest tunnels on the line, with a station and tea stop at Barog.", tip: "Pause at the station cafe while the train waits." },
      { name: "Solan", at: [77.09,30.91], text: "A hill town surrounded by pine ridges and orchards.", tip: "Views open up on both sides after the stop." },
      { name: "Shimla Ridge", at: [77.17,31.104], text: "An open promenade with colonial buildings and Himalayan views.", tip: "Walk up from the station at the end of the ride." } ],
    article: [
      { heading: "A toy train to the summer capital", paragraphs: [
        "When the British made Shimla the summer capital of India, the only way up was a long journey by road. The Kalka–Shimla Railway, opened in 1903, solved that with a narrow-gauge line that climbs from the plains at Kalka, around 650 m above sea level, to Shimla at more than 2,000 m in just 96 km.",
        "The track is only 762 mm (2 ft 6 in) wide, which lets the small trains take tight curves around the hillsides. More than a hundred tunnels and hundreds of arched stone bridges carry the line, and in 2008 it was added to the UNESCO World Heritage Site of the Mountain Railways of India, alongside the Darjeeling and Nilgiri lines.",
      ] },
      { heading: "What you see on the way up", paragraphs: [
        "The first hour out of Kalka climbs through dry scrub and Shivalik foothills, with the plains falling away behind you. The train loops around spurs and crosses multi-arched gallery bridges that look like Roman aqueducts.",
        "Barog, roughly halfway, is known for its long tunnel, the longest on the line at a little over a kilometre. The station is a traditional stop, and many trains pause long enough for tea. Beyond Solan the slopes are covered in pine and deodar forest, and on clear days the snow peaks of the higher Himalaya appear in the distance.",
        "The final stretch winds into Shimla past Summer Hill and the old colonial buildings, ending at a small station below the Mall Road.",
      ] },
      { heading: "When to go", paragraphs: [
        "March to June is the most popular time, with pleasant weather in Shimla while the plains are hot, so trains are busy and seats should be booked well ahead. The monsoon, July to September, brings mist and green hills but also occasional landslides. October and November usually have the clearest mountain views. In winter, from December to February, Shimla can get snow, and the ride through frosted forest is beautiful, though cold.",
      ] },
      { heading: "Choosing a train", paragraphs: [
        "Several trains run each day, ranging from basic second-class services to trains with reserved first-class seats and glass-roofed sightseeing coaches. The ride takes about five hours whichever you choose, because the speed is set by the curves rather than the train. Early-morning departures connect with overnight trains from Delhi arriving at Kalka.",
        "Seats sell out quickly in peak season and on weekends. If you cannot get a reservation for the whole route, consider riding the most scenic section between Barog and Shimla, or travelling one way by train and returning by road.",
      ] },
      { heading: "Tips for the ride", paragraphs: [
        "On the way up, the valley views open out on both sides, so there is no single best side; a window seat matters more than which window. Carry a light jacket even in summer, since tunnels and higher sections are noticeably cooler. If you are prone to motion sickness, the many curves are worth preparing for. At the end of the ride, walk up from the station to the Ridge for the classic view across the hills.",
      ] },
    ] },
  { slug: "darjeeling", name: "Darjeeling Himalayan Railway", place: "New Jalpaiguri to Darjeeling, India", region: "India", distance: "about 88 km", duration: "about 7 hours",
    blurb: "A two-foot-gauge toy train that loops and reverses up to the tea ridges below Kanchenjunga.",
    line: [[88.42,26.68],[88.36,26.79],[88.33,26.85],[88.28,26.88],[88.27,26.95],[88.26,27.01],[88.26,27.04]],
    sights: [
      { name: "Agony Point", at: [88.33,26.85], text: "A sharp loop in the climb above Tindharia, where the train almost meets itself as it gains height.", tip: "This stretch is slow. Stay by the window through the zigzags." },
      { name: "Kurseong", at: [88.28,26.88], text: "A hillside bazaar town about halfway up, with tea gardens on the slopes around the station.", tip: "The station sits on the main road, so you can step straight into town." },
      { name: "Ghum", at: [88.26,27.01], text: "The highest station on the line, at about 2,258 m, with a small railway museum beside the platform.", tip: "On a clear morning Kanchenjunga is visible from here." },
      { name: "Batasia Loop", at: [88.258,27.017], text: "A spiral just below Darjeeling, built so the train can drop height, with a war memorial in the middle of the circle.", tip: "The joy-ride trains between Darjeeling and Ghum pass it slowly." },
    ],
    article: [
      { heading: "The toy train to the tea hills", paragraphs: [
        "Darjeeling became a hill station because the plains of Bengal were considered too hot for a summer capital. The road up from the Teesta valley was long, so in 1881 the Darjeeling Himalayan Railway opened a two-foot (610 mm) line from the plains at Siliguri to the ridge at Darjeeling. It is one of the three lines in the UNESCO Mountain Railways of India.",
        "The line still climbs about 2,000 metres in roughly 88 km from New Jalpaiguri. It cannot do that in a straight line. Between Sukna and Kurseong the track loops back on itself and uses reverses, where the train pulls into a dead-end spur and comes out going the other way. One of those loops is still called Agony Point.",
      ] },
      { heading: "What you see on the way up", paragraphs: [
        "The first hour out of New Jalpaiguri crosses the flat Dooars, with the hills as a wall ahead of you. Once the climb starts, the vegetation changes from sal forest to tea. The bushes are planted in contours, so the hillsides look striped, and the little processing factories sit in the middle of the gardens.",
        "Kurseong is the traditional halfway stop, a bazaar town strung along the road that the railway shares in places. Above it the line runs through pine and cryptomeria, and on a clear day the white mass of Kanchenjunga appears to the north.",
        "Ghum, at about 2,258 m, is the highest station. Just beyond it the track enters the Batasia Loop, a full circle that lets the train lose height gently before it rolls into Darjeeling. A war memorial occupies the centre of the loop, and the town's ridge is only a few minutes further on.",
      ] },
      { heading: "When to go", paragraphs: [
        "October and November, and again March to May, are the months when Kanchenjunga is most often clear of cloud. Winter mornings are cold and sharp, which is good for the view and less good if you are in an unheated carriage. The monsoon, from June into September, turns the gardens a deep green, but landslides regularly close sections of the line, sometimes for weeks.",
        "When the full climb is shut, a short joy ride between Darjeeling and Ghum often keeps running. It misses the plains and the tea gardens, but it still covers the Batasia Loop and the highest part of the line, and it is the easiest section to get a seat on.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "There is no single best side. The loops and reverses mean the valley swaps from one window to the other several times in an hour. Kanchenjunga lies to the north, so it tends to appear on the right on the way up once you are above Kurseong, then swings past the front of the train at Batasia.",
        "A window seat matters more than which window. The carriages are narrow, and the person in the aisle sees mostly the back of someone else's head.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "The full run from New Jalpaiguri takes most of a day, around seven hours when the line is open throughout, because the average speed is set by the curves. Reserve a seat; the toy-train coaches are small and the popular departures fill up. New Jalpaiguri is the practical start, since broad-gauge trains from Kolkata and the rest of India terminate there.",
        "Diesel locomotives work most services. Steam is occasional and is advertised separately, so do not assume the chimney smoke you see in photographs will be on your train. Carry a layer even in summer. Ghum and Darjeeling are much colder than the station where you boarded, and the joy of a toy train wears off quickly if you are shivering.",
      ] },
    ] },
  { slug: "nilgiri", name: "Nilgiri Mountain Railway", place: "Mettupalayam to Ooty, India", region: "India", distance: "46 km", duration: "about 5 hours",
    blurb: "India's only rack railway, climbing from the plains to Ooty through eucalyptus and tea.",
    line: [[76.96,11.30],[76.88,11.33],[76.82,11.35],[76.80,11.35],[76.75,11.38],[76.70,11.41]],
    sights: [
      { name: "Rack section above Kallar", at: [76.87,11.33], text: "The steepest part of the climb, where a toothed rail between the running rails lets the steam engine haul the train up the ghat.", tip: "This is the slowest, loudest stretch. Keep the window open if you can." },
      { name: "Hillgrove", at: [76.81,11.35], text: "A small station cut into the hillside, with a long view back down toward the plains.", tip: "Trains often pause here. Step to the platform edge for the view." },
      { name: "Coonoor", at: [76.80,11.35], text: "The midway hill station, where the rack section ends and the line eases toward Ooty through tea gardens.", tip: "Coonoor has bakeries and a tea factory within a short walk of the station." },
      { name: "Ooty station", at: [76.70,11.41], text: "The terminus at Udhagamandalam, a small station below the botanical garden and the lake.", tip: "The botanical garden is a short uphill walk from the platform." },
    ],
    article: [
      { heading: "The only rack railway in India", paragraphs: [
        "The Nilgiri climb was too steep for an ordinary adhesion railway. Between Mettupalayam, on the plains at about 300 m, and Coonoor, the line uses an Abt rack: a toothed third rail that a cog on the locomotive engages. Above Coonoor the gradient eases and the train runs as a normal railway to Udhagamandalam, usually called Ooty, at about 2,200 m. The whole journey is only 46 km and still takes about five hours.",
        "The line was completed in 1908. In 2005 it joined the Darjeeling and Kalka–Shimla railways as part of the UNESCO Mountain Railways of India. The rack section is still worked by X-class steam locomotives, Swiss-built engines with the cog gearing mounted under the boiler. They are among the last steam engines in daily use on an Indian passenger railway.",
      ] },
      { heading: "What you see on the way up", paragraphs: [
        "Leaving Mettupalayam, the line runs through cultivated flatland and then into the first curves at Kallar, where the rack begins. The train's pace drops to a walking speed. You can watch the cog engage, and on the tighter curves you can see the locomotive from the carriage window as the train bends around a spur.",
        "The published inventory of the line is a clue to how folded the hillside is: more than 200 curves, 16 tunnels and about 250 bridges in those 46 km. Between tunnels the view opens down forested valleys, with the plains as a pale haze on a clear day. Hillgrove is the classic pause, a platform hung on the slope.",
        "Coonoor is the change of character. The rack ends, tea estates take over from the wetter forest, and eucalyptus lines the track. The last hour into Ooty is gentler, past Wellington and Lovedale, and finishes at a small station below the town's lake and botanical garden.",
      ] },
      { heading: "When to go", paragraphs: [
        "April to June is when people from the plains escape the heat, so the train is busy and Ooty is crowded. October to March is cooler and usually clearer, and it is the better time if the point of the trip is the view rather than the town. The monsoon, roughly June to September on this coast of the hills, brings mist that sits in the valleys. It is atmospheric and it hides the plains.",
        "Landslips do close the rack section. If your dates are fixed, check that the Mettupalayam–Coonoor portion is running, not only the easier Coonoor–Ooty shuttle, which operates more often.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "The line zigzags, so the valley changes sides. Neither window has a monopoly on the view for the whole climb. What matters is sitting by a window at all, and preferably one you can open on the rack section, where the steam and the sound of the cog are half the point.",
        "If you only ride one portion, the rack section from Mettupalayam to Coonoor is the one to book. Coonoor to Ooty is a pleasant tea-garden ride, but it is an ordinary adhesion railway and it is not why this line is famous.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Seats on the steam-worked morning departure sell out, especially in April, May and around holidays. First class is a small reserved coach; second class is fine if you have a window, and it is the more likely place to be able to open it. Book as soon as reservations open.",
        "Mettupalayam connects with broad-gauge trains from Coimbatore and Chennai, so the practical pattern is an overnight train to Coimbatore, a short connection to Mettupalayam, and the hill train in the morning. The temperature drop is large. A jacket that felt absurd on the platform at Mettupalayam is useful by Coonoor. The steam engines are slow and the carriages are old, which is the attraction, so do not plan a tight connection at the top.",
      ] },
    ] },
  { slug: "kangra-valley", name: "Kangra Valley Railway", place: "Pathankot to Jogindernagar, India", region: "India", distance: "164 km", duration: "about 10 hours",
    blurb: "A narrow-gauge line along the foot of the Dhauladhar, through tea, temples and small hill towns.",
    line: [[75.65,32.27],[75.90,32.25],[76.27,32.22],[76.53,32.12],[76.65,32.05],[76.92,31.99]],
    sights: [
      { name: "Kangra", at: [76.27,32.22], text: "A temple town below Kangra Fort, which stands on a spur above the Banganga.", tip: "Kangra Mandir station is the stop for the old town. The fort is a short ride uphill." },
      { name: "Palampur", at: [76.53,32.12], text: "A tea town on a shelf of the Dhauladhar, with the snow line visible behind the estates on a clear day.", tip: "The station is below the bazaar. Allow time if you want to walk up into the tea gardens." },
      { name: "Baijnath", at: [76.65,32.05], text: "A 13th-century Shiva temple in a small town, a short walk from Baijnath Paprola station.", tip: "The temple is close enough to visit between trains if you are not riding the whole line." },
      { name: "Jogindernagar", at: [76.92,31.99], text: "The terminus, in a valley below the Dhauladhar, historically the railhead for the region's hydroelectric works.", tip: "There is not much at the station itself. The point of this end of the line is the approach." },
    ],
    article: [
      { heading: "A railway along the foot of the Dhauladhar", paragraphs: [
        "The Kangra Valley Railway opened in 1929 to serve the towns along the southern edge of the Dhauladhar range in Himachal Pradesh. It is narrow gauge, 2 ft 6 in (762 mm), the same width as the Kalka–Shimla line, and it runs 164 km from Pathankot, on the Punjab plain, to Jogindernagar.",
        "It is not a UNESCO mountain railway, and it does not climb to a ridge the way the Shimla or Darjeeling lines do. It stays in the valley, which is exactly why the views are good: the wall of the Dhauladhar stays in front of you for hours, and the towns you pass are places people actually live rather than viewpoints built for the train.",
      ] },
      { heading: "What you see along the valley", paragraphs: [
        "From Pathankot the line runs east through farmland and low hills, with the range growing ahead of you. Kangra is the first famous stop. The town is known for the goddess temple, and Kangra Fort occupies a steep spur above the river. Neither is at the platform, but both are a short ride from Kangra Mandir station.",
        "Further east the countryside becomes tea. Palampur's estates cover the shelves of land under the peaks, and on a clear winter morning the snow line looks close enough to touch. Baijnath, one stop on, has a stone Shiva temple from the 13th century, unusually close to the station at Baijnath Paprola.",
        "The last stretch into Jogindernagar follows the valley as it narrows. The town was developed around a hydroelectric scheme that used water dropped from the mountains above, and the railway was its supply line. The station is the end of the passenger run.",
      ] },
      { heading: "When to go", paragraphs: [
        "October to March is the time for the peaks. The air is clear, the Dhauladhar often carries snow, and the light is hard and good. Summer is hazy, and the range fades into the sky by midday. The monsoon greens the valley and swells the streams, and it also brings landslides that delay or cancel trains.",
        "This is a slow line. A full run takes about ten hours, so a winter departure that leaves late in the morning can finish in the dark. Check the timetable and prefer a train that covers the Palampur and Baijnath stretch in daylight.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "The Dhauladhar stands to the north of the track for most of the journey. Travelling from Pathankot toward Jogindernagar, that puts the peaks on your left. Coming back, they are on your right.",
        "The line curves enough that this is a tendency, not a rule for every kilometre. Tea gardens and river crossings appear on both sides. If you can only choose once, take the north side: left toward Jogindernagar, right toward Pathankot.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Pathankot is the connection with the broad-gauge network, including trains from Delhi. The narrow-gauge coaches are unreserved on many services, so boarding at the terminus is much easier than joining midway at Palampur, where the train may already be full. If you only want the scenic middle, join at Kangra early in the run rather than at the busiest hill station.",
        "Ten hours is a long time in a narrow-gauge coach. Carry water and food; station stalls are small and halts are short. Jogindernagar is a real terminus, with buses onward into the hills, but it is a poor place to arrive at night without a plan. Many people ride as far as Palampur or Baijnath and stop there.",
      ] },
    ] },
  { slug: "vizag-araku", name: "Visakhapatnam to Araku", place: "Andhra Pradesh, India", region: "India", distance: "about 120 km", duration: "about 5 hours",
    blurb: "A climb from the Bay of Bengal into the Eastern Ghats, through tunnels to the Araku valley and Borra Caves.",
    line: [[83.30,17.72],[83.20,17.95],[83.04,18.28],[82.92,18.32],[82.86,18.33]],
    sights: [
      { name: "Borra Caves", at: [83.04,18.28], text: "A limestone cave system in the ghats, a short distance from Borra Guhalu station.", tip: "The caves are the usual reason to break the journey. Allow a couple of hours." },
      { name: "Araku valley", at: [82.86,18.33], text: "A high valley of coffee gardens and villages, cooler than the coast you left the same morning.", tip: "The station is below the main bazaar. Coffee shops and the tribal museum are in the town, not at the platform." },
      { name: "Eastern Ghats tunnels", at: [83.15,18.05], text: "A long sequence of tunnels and bridges as the line claws up from the coastal plain.", tip: "Sit by a window before the climb. The openings between tunnels are short." },
    ],
    article: [
      { heading: "From the coast into the Eastern Ghats", paragraphs: [
        "Visakhapatnam sits on the Bay of Bengal. Araku is a coffee valley in the Eastern Ghats, about 120 km inland and several hundred metres higher. The railway between them is part of the Kothavalasa–Kirandul line, built to carry iron ore down from the interior, and the passenger ride has become one of the better-known scenic trips in South India.",
        "The train leaves the coast, crosses the hot plain, and then climbs through a band of forested escarpment. Much of that climb is in tunnel. Between the tunnels the line crosses bridges over forested drops, and the air cools as the plain falls away behind you.",
      ] },
      { heading: "What you see on the way up", paragraphs: [
        "The first part, through the outskirts of Visakhapatnam, is ordinary city and then paddy and scrub. The scenery starts when the gradient steepens and the tunnels begin. Windows alternate between darkness and a brief view of a valley. It is worth staying awake for, because the openings are short and a tunnel can last several minutes.",
        "Borra Guhalu station is the stop for the Borra Caves, a limestone system with a stream running through it, a short ride or walk from the platform depending on how you arrange it. The caves are the usual place to break the journey if you are not in a hurry to reach Araku.",
        "Araku itself is a wide valley rather than a precipice. Coffee is grown on the slopes, the town has a market used by the surrounding villages, and the temperature is noticeably kinder than the coast you left that morning. The famous viewpoints around the valley are reached by road from the town, not from the train window.",
      ] },
      { heading: "When to go", paragraphs: [
        "October to March is the comfortable season, with clearer air in the hills and a bearable coast at the start of the ride. Summer on the coastal plain is very hot, and the valley, while cooler, is not a high Himalayan station. The monsoon greens the ghats and fills the waterfalls near Borra, and it also brings fog that erases the views between tunnels, plus the occasional disruption on a line that crosses unstable hillside.",
        "Weekends and public holidays are when the sightseeing coaches sell out. If the date is fixed, book the reserved coach early rather than relying on turning up.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "In the ghat section the line twists enough that valleys open on both sides, often for less than a minute at a time. A dedicated left or right seat matters less here than it does on a coast line. What matters is a window, and a coach designed for looking out.",
        "Some services carry a Vistadome coach, with larger windows and a glass roof, aimed at this ride. Those seats are the ones to book if the views are the reason for the trip. They sell out ahead of the ordinary reserved coaches, and the train numbers of the specials change, so check the current timetable rather than an old blog post.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Visakhapatnam is the practical start. It is a major station, with connections along the east coast. The ride up takes about five hours, so a morning departure puts you in Araku for lunch and leaves the afternoon for the valley. Doing it in a day from Visakhapatnam and back is possible and rushed. Staying one night in Araku makes the caves and the valley a trip rather than a blur.",
        "Food on the sightseeing specials varies. Carry water anyway. The temperature drop is real but modest compared with a Himalayan line, so a light layer is enough outside the monsoon. If you stop at Borra, know how you will rejoin a train or a road to Araku before you get off. The next passenger train may be many hours later.",
      ] },
    ] },
  { slug: "bernina-express", name: "Bernina Express", place: "St. Moritz to Tirano, Switzerland and Italy", region: "Switzerland", distance: "about 61 km", duration: "about 2 hours 20 minutes",
    blurb: "An open crossing of the Bernina Pass, then a spiral viaduct down into Italy.",
    line: [[9.84,46.50],[9.90,46.49],[9.94,46.45],[10.02,46.41],[10.06,46.37],[10.06,46.32],[10.12,46.25],[10.17,46.22]],
    sights: [
      { name: "Morteratsch", at: [9.94,46.45], text: "A station below the retreating Morteratsch glacier, with the ice visible up the valley on a clear day.", tip: "The glacier trail starts near the station if you get off and ride a later train." },
      { name: "Lago Bianco", at: [10.02,46.41], text: "A pale lake at the Bernina Pass, beside the highest point of the line at Ospizio Bernina, 2,253 m.", tip: "The pass is crossed in the open. Have the camera ready as the lake appears." },
      { name: "Alp Grüm", at: [10.06,46.37], text: "A station on the lip of the Poschiavo valley, looking at the Palü glacier and a drop of several hundred metres.", tip: "Regional trains stop here. The panoramic express may not, so look from the window as you pass." },
      { name: "Brusio spiral", at: [10.12,46.25], text: "A stone viaduct of nine arches that turns a full circle so the train can lose height before Tirano.", tip: "You can see the viaduct from the train as it circles, and from the road beneath it if you come back." },
    ],
    article: [
      { heading: "Over the pass in the open", paragraphs: [
        "The Bernina Railway is the other half of the Rhaetian Railway's UNESCO World Heritage line, listed in 2008 together with the Albula route that the Glacier Express uses. They are different rides. The Glacier Express is a long east-west traverse. The Bernina Express, on the section that makes it famous, runs south from St. Moritz, crosses the Bernina Pass at 2,253 m, and drops to Tirano in Italy. The pass is crossed in the open. There is no summit tunnel.",
        "The panoramic Bernina Express covers the 61 km from St. Moritz to Tirano in about two hours and twenty minutes. Regional trains use the same track, stop more often, and do not need the supplement the express charges.",
      ] },
      { heading: "The journey, stage by stage", paragraphs: [
        "From St. Moritz the train runs down to Pontresina and then climbs the valley toward the pass. Morteratsch station sits under a glacier that has retreated far up its valley; you still see the ice, and the scale of the retreat is part of what you are looking at.",
        "Ospizio Bernina is the highest point, next to Lago Bianco, a lake that sits on the watershed. In early summer it is edged with snow. The line then tips over the south side. Alp Grüm is the viewpoint: the Palü glacier on one hand, and the Poschiavo valley a long way below on the other. The descent from here is the steep part, through tunnels and curves into Poschiavo, an Italian-speaking Swiss town with a compact old centre.",
        "Below Brusio the train enters a circular viaduct of nine stone arches and turns a full circle to lose height without a gradient the carriages cannot handle. It is the photograph everyone has seen, and it is better from the train than the photograph suggests, because you watch your own tail as you come around. A few minutes later the line flattens into Tirano, where Italian trains take over.",
      ] },
      { heading: "When to go", paragraphs: [
        "The line runs all year, which is unusual for an open Alpine pass this high, and winter is a genuine alternative rather than a closure. The pass is white, Lago Bianco freezes at the edges, and the panoramic windows fog if the carriage is crowded and wet. Summer has long days, open trails at Morteratsch and Alp Grüm, and the heaviest demand for seats. Late spring and early autumn are the compromise: snow is still possible at the pass, and the express is easier to book.",
        "Cloud on the pass hides the glaciers and leaves you with the spiral, which is in the valley and usually clear. If a glacier view is the reason for the date you picked, look at the forecast for the Bernina Pass itself, not for St. Moritz town.",
      ] },
      { heading: "Tickets and seats", paragraphs: [
        "A seat reservation is compulsory on the Bernina Express panoramic train and is charged on top of the fare. A Swiss Travel Pass or similar covers the travel on the Swiss part and not the reservation. The same track is served all day by regional trains, which need no reservation and stop at Alp Grüm and Morteratsch, where the express often does not.",
        "If you want to get off, ride the regional trains. If you want the tall panoramic windows and a single reserved seat from St. Moritz to Tirano, ride the express and book it. The two products are easy to confuse because they share a name with the line.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "The spiral at Brusio is the one moment people worry about, and the train curves so far that both sides see the viaduct during the circle. The glacier views at Morteratsch and Alp Grüm also shift as the line bends. Panoramic coaches have tall glass, so the penalty for the 'wrong' side is smaller than on an ordinary carriage.",
        "Travelling south from St. Moritz saves the pass and then the spiral for the second half of the ride, when you know what you are looking at. Coming north, the spiral arrives first and the pass last. Either direction works. Sitting by a window is the part that matters.",
      ] },
    ] },
  { slug: "west-highland", name: "West Highland Line", place: "Glasgow to Mallaig, Scotland", region: "United Kingdom", distance: "about 264 km", duration: "about 5 hours 30 minutes",
    blurb: "Across Rannoch Moor to Fort William, then the Glenfinnan viaduct and the coast to Mallaig.",
    line: [[-4.25,55.86],[-4.71,56.01],[-4.72,56.40],[-4.77,56.52],[-4.58,56.69],[-4.69,56.76],[-5.11,56.82],[-5.44,56.88],[-5.83,57.01]],
    sights: [
      { name: "Rannoch Moor", at: [-4.58,56.69], text: "A wide peat moor with almost no trees or houses. Rannoch station stands in the middle of it.", tip: "The moor lasts a while. This is the stretch to put the phone down." },
      { name: "Corrour", at: [-4.69,56.76], text: "A station with no public road, used by walkers heading onto the moor and into the hills.", tip: "Trains do stop. Only get off if you mean to. The next train may be hours away." },
      { name: "Glenfinnan Viaduct", at: [-5.72,56.88], text: "A curved concrete viaduct of 21 arches, opened in 1901, in the valley above Loch Shiel.", tip: "The viaduct is just east of Glenfinnan station. Watch for it soon after you leave the station toward Mallaig, or before it if you are coming from Mallaig." },
      { name: "Arisaig coast", at: [-5.92,56.91], text: "White sand and a scatter of islands. On a clear day Eigg, Rum and Skye are visible from the train.", tip: "This is the sea section, after Glenfinnan and before Mallaig." },
    ],
    article: [
      { heading: "The line to the western edge of the mainland", paragraphs: [
        "The West Highland Line runs from Glasgow Queen Street to Mallaig, about 264 km, and takes around five and a half hours on the ordinary ScotRail service. It was built in two main efforts: the line across the moor to Fort William in the 1890s, and the Mallaig Extension, opened in 1901, which carries the viaduct everyone now recognises.",
        "The extension was an early large use of mass concrete, and the Glenfinnan Viaduct, 21 arches on a curve, is its monument. The Jacobite steam train, which runs on this section in season, made the viaduct famous again by appearing in the Harry Potter films. The steam train and the regular ScotRail service are different tickets on the same track.",
      ] },
      { heading: "What you see from the window", paragraphs: [
        "North of Glasgow the line follows sea lochs, then turns inland and climbs onto Rannoch Moor. The moor is the strange part of the ride: peat, pools, and a station with no town. Corrour, a little further on, has no public road at all. People get off with packs and disappear into the hill. Do not get off to stretch your legs.",
        "The line drops to Fort William under Ben Nevis, which is visible on a clear day and missing in cloud more often than the postcards suggest. Beyond Fort William the Mallaig section is the one to stay awake for. The train crosses the Glenfinnan Viaduct above Loch Shiel, then runs out to the coast at Arisaig and Morar, with pale beaches and, in good weather, the Small Isles and the hills of Skye.",
        "Mallaig is a working harbour at the end of the line, with ferries toward Skye and the Small Isles. The station is small and final. There is no scenic continuation by train.",
      ] },
      { heading: "When to go", paragraphs: [
        "May, June and September give you long enough days and fewer midges than July and August. Midges are a practical matter if you plan to get off at Glenfinnan or anywhere still. July and August are the busiest weeks for the Jacobite, and also the brightest weather, when it happens. Winter has short days. A late start from Glasgow can put the viaduct in the dark, and the steam train does not run.",
        "The Jacobite season is roughly spring to autumn and the dates change each year. If the steam engine is the point, book that ticket and check the season. If the landscape is the point, the ScotRail train covers the same viaduct, the same moor and the same coast, and it runs all year.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "On the Mallaig side of Fort William, the coast and the islands lie to the west. Heading toward Mallaig, that is mostly your left. The Glenfinnan Viaduct itself curves, and you see the arches from the carriage as you cross rather than from one privileged window.",
        "Across Rannoch Moor either side is open, and there is nothing to block. A window seat is worth arranging for the Fort William to Mallaig hour, and less critical on the moor, where you can see past the person next to you.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Glasgow Queen Street is the start of the through service. You can join at Fort William if you only want the viaduct and the coast, and that shorter ride is about an hour and a half. Seats are not reserved on the ordinary train, so boarding at Glasgow or at Fort William early matters more than a seat number. The Jacobite is reserved and sells out, particularly in school holidays. Buy it from the operator, not as a ScotRail ticket.",
        "Weather changes the ride more than the timetable does. A clear day on the coast is a different journey from a day of low cloud, and both are normal. Carry a layer. Even in August the wind at Glenfinnan is not a city wind. If you want a photograph of the viaduct with the train on it, you need to be off the train, on the hillside path above the viaduct, and that means planning a stop at Glenfinnan rather than watching from the carriage.",
      ] },
    ] },
  { slug: "bergen-line", name: "Bergen Line", place: "Oslo to Bergen, Norway", region: "Norway", distance: "nearly 500 km", duration: "about 7 hours",
    blurb: "Across the Hardangervidda plateau, past Finse, to the fjords at Bergen.",
    line: [[10.75,59.91],[10.05,60.15],[8.50,60.50],[7.50,60.60],[7.12,60.74],[6.42,60.63],[5.33,60.39]],
    sights: [
      { name: "Finse", at: [7.50,60.60], text: "The highest station on the Norwegian network, at 1,222 m, on the Hardangervidda plateau with no public road.", tip: "Trains stop, but only get off if you have a plan. There is no road out." },
      { name: "Hardangervidda", at: [7.80,60.55], text: "The open mountain plateau the line crosses between the eastern valleys and the western fjords.", tip: "The open section is shorter than the whole journey. Watch for it after the long climb from the east." },
      { name: "Myrdal", at: [7.12,60.74], text: "The junction for the Flåm Railway, which drops from here to the Aurlandsfjord.", tip: "If you are changing for Flåm, this is the station. The connection is the point of stopping." },
      { name: "Voss", at: [6.42,60.63], text: "A town in the valley west of the plateau, with a lake and the first real lowland after the high section.", tip: "A sensible place to break the journey if you do not want all seven hours in one seat." },
    ],
    article: [
      { heading: "The railway across the plateau", paragraphs: [
        "The Bergen Line, Bergensbanen, opened through in 1909 and tied Oslo to Bergen without a sea voyage around the south coast. It runs nearly 500 km and takes about seven hours. The reason to ride it is the middle: the Hardangervidda, a mountain plateau the line crosses at a height where, for a while, there are no trees.",
        "Finse, at 1,222 m, is the highest station on the main-line network in Norway. It has a hotel, a railway platform and no public road. In winter the plateau around it is a single snowfield, and the railway is kept open with snow sheds and ploughs. In summer it is rock, lichen and leftover snow in the hollows.",
      ] },
      { heading: "What you see on the way", paragraphs: [
        "Leaving Oslo, the line runs through ordinary eastern Norwegian country: woods, lakes, small towns. The climb is gradual enough that the moment you are on the plateau arrives late. When it does, the view opens out and stays open past Finse, with snow fences and the occasional shed over the track to show how the line survives the winter.",
        "West of the summit the line drops toward Myrdal, the junction where the Flåm Railway branches off and falls to the Aurlandsfjord. You do not see that fjord from the Bergen train. You see the station where you would change if you wanted to. Staying aboard, you continue down to Voss, in a valley with a lake, and then through a series of tunnels to Bergen.",
        "Bergen's station is the end of the scenery. The harbour and the old wharf at Bryggen are a short walk away, which is the usual reason to arrive this way rather than by air.",
      ] },
      { heading: "When to go", paragraphs: [
        "February to April is the time for a white plateau, with enough daylight to see it and skiers using Finse as a base. June to September is the hiking season, the snow pulls back to patches, and the Flåm connection is running at full strength if you want to combine the two. December and January the line still runs, and the daylight around Finse is short enough that you can cross the best section in the dark if you pick the wrong departure.",
        "The plateau makes its own weather. A forecast of rain in Bergen does not tell you whether Finse will be clear, and a clear Oslo morning can still end in cloud on the watershed. The ride is worth taking in grey weather. It is a different and duller ride if the open section happens to be in darkness, so check sunrise and the timetable together.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "Across the Hardangervidda the plateau is open on both sides, and the track spends real time in snow sheds and tunnels where there is nothing to see. There is no reliable 'best side' for the whole seven hours. A window seat is worth having for the half hour around Finse, and less important through the forest at either end.",
        "If you are combining this with the Flåm Railway, do not spend the seat choice on the Bergen Line. Spend it on the branch, which is twenty kilometres of continuous valley. The Bergen train is the way you get to Myrdal.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Long-distance trains on this line take seat reservations, and in summer the popular departures do sell out. Book the through train if you want one seat from Oslo to Bergen. Getting off at Finse or Myrdal is a separate decision: both stations have trains onward, and neither is a place to improvise at night. Finse in particular is a platform and a hotel in the middle of a plateau.",
        "The classic combination is the Bergen Line as far as Myrdal, the Flåm Railway down to the fjord, and a ferry onward. That is a full day and it needs the connection times checked, because the Flåm trains are timed to meet certain Bergen Line services and not others. If you only ride one train in Norway, and you want the famous drop to the water, the Flåm branch is the concentrated version. The Bergen Line is the crossing of the country.",
      ] },
    ] },
  { slug: "flam", name: "Flåm Railway", place: "Myrdal to Flåm, Norway", region: "Norway", distance: "20 km", duration: "about 1 hour",
    blurb: "One of the steepest adhesion railways in the world, dropping from the Bergen Line to the Aurlandsfjord.",
    line: [[7.12,60.74],[7.14,60.75],[7.13,60.79],[7.11,60.86]],
    sights: [
      { name: "Kjosfossen", at: [7.14,60.75], text: "A waterfall beside the line. The train stops so passengers can step onto a viewing platform.", tip: "The stop is short. Get out promptly if you want the photograph without the window in the way." },
      { name: "Myrdal", at: [7.12,60.74], text: "The upper terminus, on the Bergen Line at about 867 m, where you change from the Oslo–Bergen train.", tip: "The connection is the whole reason Myrdal exists as a place to stand. Watch the platform announcements." },
      { name: "Flåm", at: [7.11,60.86], text: "A small village at the head of the Aurlandsfjord, two metres above the water, with ferries onward into the Sognefjord.", tip: "The ferry quay is a short walk from the station. Match the train to a boat if you are continuing." },
    ],
    article: [
      { heading: "A branch line that became the main event", paragraphs: [
        "The Flåm Railway is 20 km long. It leaves the Bergen Line at Myrdal, 867 m above the sea, and drops to Flåm, which is essentially at sea level on the Aurlandsfjord. The maximum gradient is 5.5 percent, and the trains grip the rail by adhesion alone. There is no rack. For a conventional railway that is extremely steep, and it is the fact the line is built around.",
        "Construction finished in 1940. For decades it was a local branch. It is now one of the busiest tourist railways in Europe, because the drop is continuous, the valley is narrow, and a fjord ferry waits at the bottom. Most people ride it as part of a longer day that includes the Bergen Line, the boat, or both.",
      ] },
      { heading: "What you see on the way down", paragraphs: [
        "The upper station at Myrdal feels like an annex of the main line: a platform in a high valley, often cold when Bergen is mild. The train leaves and immediately starts to fall. There are twenty tunnels. One of them turns the train back on itself inside the mountain, so you emerge heading the other way, a little lower down.",
        "Kjosfossen is the set piece. The river falls beside the track, and the train stops at a platform long enough for everyone to get out, look, and get back on. In season the spray reaches the platform. It is the one place on the ride where you are meant to leave your seat.",
        "Below the waterfall the valley widens slightly, farms appear on the small patches of flat ground, and the fjord shows itself late, which is the right order. Flåm is a handful of streets at the water. The station and the ferry quay are the village.",
      ] },
      { heading: "When to go", paragraphs: [
        "May to September is when the full pattern runs: frequent trains, the waterfall in spate from snowmelt early in that window, and ferries connecting into the Sognefjord. June and July are the most crowded. The train itself runs through the winter as well, with a thinner timetable, and the valley in snow is stark and much quieter. What you lose in winter is the easy onward ferry and the long evening.",
        "The waterfall is more impressive while snow is still melting, in late spring and early summer, than in a dry August. The fjord looks better in any season than the ride does if you are stuck in the aisle of a full carriage. In peak weeks, a reserved seat is the difference between seeing the valley and seeing a backpack.",
      ] },
      { heading: "Which side to sit on", paragraphs: [
        "The valley is narrow enough that cliffs and falls appear on both sides, and the turning tunnel swaps your view partway down. Kjosfossen is the sight people come for, and the train stops there, so you are not dependent on having the right window for those few minutes. You can stand on the platform.",
        "A window still matters for the rest of the hour, which is the actual ride. If the coach is the older type with a table, the people facing backward and the people facing forward swap the view at the turning tunnel. Neither seat is wasted.",
      ] },
      { heading: "Planning the trip", paragraphs: [
        "Buy the ticket before you travel in summer. The trains are timed to meet selected Bergen Line services at Myrdal, and the popular connections sell out. If you are coming from Oslo or Bergen, book the main-line seat and the Flåm seat together so the connection exists. Missing it at Myrdal is a cold wait.",
        "Flåm to Myrdal is the same line in reverse, and the climb is the same scenery more slowly from your point of view, because you are watching it approach rather than drop away. Most people prefer to descend. At the bottom, the usual continuation is a ferry on the Aurlandsfjord, which is a branch of the Sognefjord. The boat is a separate ticket and a separate timetable. Build the day around the connection you actually hold, not around a blog's sample itinerary from a previous summer.",
      ] },
    ] },
];

const REGION_ORDER = ["India", "Switzerland", "United Kingdom", "Norway"];

/** Catalog routes grouped for the index and the homepage, India first. */
export function routesByRegion(): { region: string; routes: Route[] }[] {
  const order = new Map(REGION_ORDER.map((name, i) => [name, i]));
  const groups = new Map<string, Route[]>();
  for (const route of routes) {
    const key = route.region || "Other";
    const list = groups.get(key);
    if (list) list.push(route);
    else groups.set(key, [route]);
  }
  return [...groups.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99) || a[0].localeCompare(b[0]))
    .map(([region, items]) => ({ region, routes: items }));
}
