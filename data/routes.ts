import type { Stop } from "@/lib/rail";
export type Sight = { name: string; at: [number, number]; text: string; tip?: string; img?: string; url?: string };
export type Section = { heading: string; paragraphs: string[] };
export type Route = { slug: string; name: string; place: string; distance: string; duration: string; blurb: string; line: [number, number][]; sights: Sight[]; stops?: Stop[]; article?: Section[] };
// Coordinates are [lng, lat] and hand-simplified. For exact track geometry, export railway=rail ways from OpenStreetMap (Overpass) and replace `line`.
export const routes: Route[] = [
  { slug: "konkan", name: "Konkan Railway", place: "Maharashtra to Karnataka, India", distance: "about 740 km", duration: "about 12 hours",
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
  { slug: "glacier-express", name: "Glacier Express", place: "Zermatt to St. Moritz, Switzerland", distance: "about 290 km", duration: "about 8 hours",
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
  { slug: "kalka-shimla", name: "Kalka–Shimla Railway", place: "Haryana to Himachal Pradesh, India", distance: "96 km", duration: "about 5 hours",
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
    ] }
];
