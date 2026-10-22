// Variante "Pokale spaeter": Holz auf die 5. Rechnung, Gold bleibt auf der 7., Platin auf die 11., Kristall bleibt auf der 14.
// (nummer = Rechnungs-Index ab 0; faellt er auf einen Kredit, rutscht der Pokal eine Rechnung weiter)
// Starten:  PATCH=werkzeuge/varianten/pokale-spaeter.js NAME=_sim-pokale RUNS=14 TAGE=80 KPS=4 desktop-app/node_modules/.bin/electron werkzeuge/sim-electron.js > _sim-pokale-log.txt
// Auswerten: POKALE=5,7,11,14 node werkzeuge/sim-auswertung.js _sim-pokale-log.txt
TROPHAEEN.find(t => t.id === "holz").nummer = 4;
TROPHAEEN.find(t => t.id === "platin").nummer = 10;
