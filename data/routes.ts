export type Sight = { name: string; at: [number, number]; text: string; tip: string };
export type Route = { slug: string; name: string; place: string; distance: string; duration: string; blurb: string; line: [number, number][]; sights: Sight[] };
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
      { name: "Murudeshwar", at: [74.49,14.09], text: "A giant Shiva statue and temple on a headland, visible from the train as you pass.", tip: "The station is right beside the temple town." } ] },
  { slug: "glacier-express", name: "Glacier Express", place: "Zermatt to St. Moritz, Switzerland", distance: "about 290 km", duration: "about 8 hours",
    blurb: "A slow panoramic train crossing 91 tunnels and 291 bridges through the Swiss Alps.",
    line: [[7.75,46.02],[7.88,46.29],[7.99,46.32],[8.35,46.54],[8.59,46.63],[8.67,46.66],[8.85,46.70],[9.20,46.77],[9.40,46.84],[9.53,46.85],[9.68,46.69],[9.87,46.54],[9.84,46.50]],
    sights: [
      { name: "Matterhorn from Zermatt", at: [7.658,45.976], text: "The pyramid peak that defines the Alps, best seen in the morning light from town.", tip: "Spend a night in Zermatt before boarding." },
      { name: "Oberalp Pass", at: [8.67,46.66], text: "The highest point of the route, with snowfields and a frozen lake in winter.", tip: "Keep your camera ready as the train crests the pass." },
      { name: "Rhine Gorge", at: [9.30,46.82], text: "Pale limestone cliffs above the young Rhine, often called Switzerland's Grand Canyon.", tip: "Look down from the windows after Ilanz." },
      { name: "Landwasser Viaduct", at: [9.678,46.676], text: "A curved stone viaduct leaving a cliff tunnel, 65 m above the valley.", tip: "Photograph it from the viewing path near Filisur." } ] },
  { slug: "kalka-shimla", name: "Kalka–Shimla Railway", place: "Haryana to Himachal Pradesh, India", distance: "96 km", duration: "about 5 hours",
    blurb: "A narrow-gauge hill railway climbing through pine forests, tunnels and arched stone bridges.",
    line: [[76.94,30.84],[77.01,30.88],[77.09,30.91],[77.12,30.96],[77.17,31.10]],
    sights: [
      { name: "Barog tunnel", at: [77.00,30.88], text: "One of the longest tunnels on the line, with a station and tea stop at Barog.", tip: "Pause at the station cafe while the train waits." },
      { name: "Solan", at: [77.09,30.91], text: "A hill town surrounded by pine ridges and orchards.", tip: "Views open up on both sides after the stop." },
      { name: "Shimla Ridge", at: [77.17,31.104], text: "An open promenade with colonial buildings and Himalayan views.", tip: "Walk up from the station at the end of the ride." } ] }
];
