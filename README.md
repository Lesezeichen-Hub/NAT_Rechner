# NAT Rechner

Ein lokaler, abhaengigkeitsfreier Rechner fuer IPv4-NAT-Planung. Das Tool hilft bei der Auslegung von PAT, statischem NAT, dynamischen NAT-Pools und Portweiterleitungen und erzeugt eine passende Cisco-IOS-Konfigurationsvorlage.

## Funktionen

- CIDR-Auswertung fuer IPv4-Netze mit Netzadresse, Broadcast, Hostbereich und nutzbaren Hosts
- PAT / NAT Overload mit Portkapazitaet und erwarteter Auslastung
- Statisches NAT als $1:1$-Zuordnung
- Dynamische NAT-Pools mit Berechnung der verfuegbaren oeffentlichen Adressen
- Beliebig viele TCP- und UDP-Portweiterleitungen
- Validierung von IPv4-Adressen, CIDR-Praefixen und Portnummern
- Kopierbare Zusammenfassung und Cisco-IOS-Konfigurationsvorlage
- Hinweis auf RFC-1918-Adressbereiche und relevante Pruefschritte vor dem Rollout
- Umschaltbarer Dark Mode; die Auswahl bleibt lokal im Browser gespeichert
- Responsive Darstellung fuer Desktop und Mobilgeraete

## Verwendung

Die Anwendung besteht nur aus statischen Dateien und benoetigt weder einen Build-Schritt noch einen Server. [index.html](index.html) kann direkt im Browser geoeffnet werden.

1. Inside-Local-Netz im CIDR-Format eingeben, beispielsweise `10.20.30.0/24`.
2. Oeffentliche Adresse sowie erwartete Anzahl gleichzeitiger Translations festlegen.
3. Den NAT-Modus auswaehlen und bei Bedarf Pool- oder statische Zuordnung eintragen.
4. Optionale Portweiterleitungen hinzufuegen.
5. Die berechnete Zusammenfassung oder IOS-Konfiguration kopieren und vor dem Einsatz Interfaces, Routing und Firewall-Regeln an die Zielumgebung anpassen.

## NAT-Modi

| Modus | Zweck | Berechnung |
| --- | --- | --- |
| PAT / Overload | Viele private Hosts teilen eine oeffentliche Adresse. | Bis zu 64.512 TCP-/UDP-Ports pro oeffentlicher IP-Adresse. |
| Statisches NAT | Ein privater Host bekommt dauerhaft eine feste oeffentliche Adresse. | Eine $1:1$-Zuordnung. |
| Dynamischer Pool | Private Hosts erhalten bei Bedarf Adressen aus einem oeffentlichen Pool. | Anzahl der Adressen zwischen Pool-Anfang und Pool-Ende. |

Die IOS-Ausgabe ist eine Vorlage. Interface-Namen, Access-Listen, Routing, Sicherheitsregeln und die plattformspezifische Syntax muessen vor einem produktiven Einsatz geprueft werden.

## Als Lesezeichen-Hub-Modul einbinden

1. Im Lesezeichen-Hub **Hinzufuegen > Lokales Modul** oeffnen.
2. Eine vorhandene Gruppe auswaehlen oder zuerst eine anlegen.
3. Als lokalen Ordner den Ordner dieses Repositories auswaehlen.
4. Das Modul speichern; der Hub stellt [index.html](index.html) dann unter seiner Modul-URL bereit.

Da alle Dateien relativ eingebunden sind, funktioniert das Modul sowohl direkt aus dem Dateisystem als auch innerhalb des Lesezeichen-Hubs.

## Dateien

- [index.html](index.html): Struktur und Bedienoberflaeche
- [app.js](app.js): IPv4-, NAT- und Konfigurationslogik
- [styles.css](styles.css): responsives Layout und helle/dunkle Oberflaeche