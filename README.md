# NAT Rechner

Ein lokaler, abhängigkeitsfreier Rechner für IPv4-NAT-Planung. Das Tool hilft bei der Auslegung von PAT, statischem NAT, dynamischen NAT-Pools und Portweiterleitungen und erzeugt eine passende Cisco-IOS-Konfigurationsvorlage.

## Funktionen

- CIDR-Auswertung für IPv4-Netze mit Netzadresse, Broadcast, Hostbereich und nutzbaren Hosts
- PAT / NAT Overload mit Portkapazität und erwarteter Auslastung
- Statisches NAT als $1:1$-Zuordnung
- Dynamische NAT-Pools mit Berechnung der verfügbaren öffentlichen Adressen
- Beliebig viele TCP- und UDP-Portweiterleitungen
- Validierung von IPv4-Adressen, CIDR-Präfixen und Portnummern
- Kopierbare Zusammenfassung und Cisco-IOS-Konfigurationsvorlage
- Hinweis auf RFC-1918-Adressbereiche und relevante Prüfschritte vor dem Rollout
- Umschaltbarer Dark Mode; die Auswahl bleibt lokal im Browser gespeichert
- Responsive Darstellung für Desktop und Mobilgeräte

## Verwendung

Die Anwendung besteht nur aus statischen Dateien und benötigt weder einen Build-Schritt noch einen Server. [index.html](index.html) kann direkt im Browser geöffnet werden.

1. Inside-Local-Netz im CIDR-Format eingeben, beispielsweise `10.20.30.0/24`.
2. Öffentliche Adresse sowie erwartete Anzahl gleichzeitiger Translations festlegen.
3. Den NAT-Modus auswählen und bei Bedarf Pool- oder statische Zuordnung eintragen.
4. Optionale Portweiterleitungen hinzufügen.
5. Die berechnete Zusammenfassung oder IOS-Konfiguration kopieren und vor dem Einsatz Interfaces, Routing und Firewall-Regeln an die Zielumgebung anpassen.

## NAT-Modi

| Modus | Zweck | Berechnung |
| --- | --- | --- |
| PAT / Overload | Viele private Hosts teilen eine öffentliche Adresse. | Bis zu 64.512 TCP-/UDP-Ports pro öffentlicher IP-Adresse. |
| Statisches NAT | Ein privater Host bekommt dauerhaft eine feste öffentliche Adresse. | Eine $1:1$-Zuordnung. |
| Dynamischer Pool | Private Hosts erhalten bei Bedarf Adressen aus einem öffentlichen Pool. | Anzahl der Adressen zwischen Pool-Anfang und Pool-Ende. |

Die IOS-Ausgabe ist eine Vorlage. Interface-Namen, Access-Listen, Routing, Sicherheitsregeln und die plattformspezifische Syntax müssen vor einem produktiven Einsatz geprüft werden.

## Als Lesezeichen-Hub-Modul einbinden

1. Im Lesezeichen-Hub **Hinzufügen > Lokales Modul** öffnen.
2. Eine vorhandene Gruppe auswählen oder zuerst eine anlegen.
3. Als lokalen Ordner den Ordner dieses Repositories auswählen.
4. Das Modul speichern; der Hub stellt [index.html](index.html) dann unter seiner Modul-URL bereit.

Da alle Dateien relativ eingebunden sind, funktioniert das Modul sowohl direkt aus dem Dateisystem als auch innerhalb des Lesezeichen-Hubs.

## Dateien

- [index.html](index.html): Struktur und Bedienoberfläche
- [app.js](app.js): IPv4-, NAT- und Konfigurationslogik
- [styles.css](styles.css): responsives Layout und helle/dunkle Oberfläche