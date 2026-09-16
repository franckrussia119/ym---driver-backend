import React from 'react';
import { WeeklyReport, formatFCFA } from '../types';
import { INITIAL_DEFECT_CATEGORIES } from '../data/defaults';
import { ensureReportDefaults } from '../data/defaults';

interface PrintableDocumentViewProps {
  report: WeeklyReport;
}

export const PrintableDocumentView: React.FC<PrintableDocumentViewProps> = ({ report: rawReport }) => {
  const report = ensureReportDefaults(rawReport);
  const driverInfo = report.driverInfo;
  const trips = report.trips;
  const tripStats = report.tripStats;
  const defects = report.defects;
  const checklist = report.checklist;
  const mechanicVerif = report.mechanicVerif;
  const observations = report.observations;
  const signatures = report.signatures;

  const totalKm = trips.reduce((acc, t) => acc + (Number(t.kmParcourus) || 0), 0);
  const totalFuel = trips.reduce((acc, t) => acc + (Number(t.carburantL) || 0), 0);
  const totalFrais = trips.reduce((acc, t) => acc + (Number(t.fraisRoute) || 0), 0);

  return (
    <div className="bg-slate-200 py-8 px-4 print:p-0 print:bg-white flex flex-col items-center">
      <div className="w-full max-w-[210mm] bg-white text-slate-900 font-sans shadow-2xl print:shadow-none p-8 print:p-0 space-y-8 print:space-y-0">
        
        {/* PAGE 1 / 4 */}
        <div className="bg-white min-h-[297mm] flex flex-col justify-between border-b-2 border-slate-300 print:border-none pb-8 print:pb-0 mb-8 print:mb-0 print:break-after-page">
          <div>
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
              <div>
                <h1 className="text-xl font-extrabold tracking-wide text-[#1e3a8a] uppercase">
                  RAPPORT HEBDOMADAIRE DU CHAUFFEUR — YM-TRANSIT
                </h1>
                <p className="text-xs font-medium text-slate-600 italic">Performance & État du Véhicule</p>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-medium">
                YM-TRANSIT — Rapport Hebdomadaire du Chauffeur
                <br />
                <span className="font-bold text-slate-800">Page 1 / 4</span>
              </div>
            </div>

            {/* SEMAINE DU ... AU ... */}
            <table className="w-full border-collapse border border-slate-400 text-xs mb-6">
              <tbody>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 w-28 border border-slate-400">
                    SEMAINE DU :
                  </td>
                  <td className="px-3 py-2 border border-slate-400 font-medium">{driverInfo.semaineDu || '—'}</td>
                  <td className="bg-slate-100 font-bold px-3 py-2 w-16 border border-slate-400">
                    AU :
                  </td>
                  <td className="px-3 py-2 border border-slate-400 font-medium">{driverInfo.semaineAu || '—'}</td>
                </tr>
              </tbody>
            </table>

            {/* SECTION 1 */}
            <div className="mb-6">
              <div className="bg-[#1e3a8a] text-white font-bold text-xs uppercase px-3 py-1.5 mb-0">
                SECTION 1 — Identification du Chauffeur et du Véhicule
              </div>
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <tbody>
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 w-1/3 border border-slate-400 uppercase">
                      NOM & PRÉNOM CHAUFFEUR
                    </td>
                    <td className="px-3 py-2 border border-slate-400 font-medium">{driverInfo.nomChauffeur || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-400 uppercase">
                      IMMATRICULATION / N° DE FLOTTE DU CAMION
                    </td>
                    <td className="px-3 py-2 border border-slate-400 font-medium">{driverInfo.immatriculation || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-400 uppercase">
                      MARQUE ET MODÈLE DU CAMION
                    </td>
                    <td className="px-3 py-2 border border-slate-400 font-medium">{driverInfo.marqueModele || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-400 uppercase">
                      N° DE REMORQUE / CHÂSSIS
                    </td>
                    <td className="px-3 py-2 border border-slate-400 font-medium">{driverInfo.noRemorque || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 2 */}
            <div className="mb-6">
              <div className="bg-[#1e3a8a] text-white font-bold text-xs uppercase px-3 py-1.5 mb-0">
                SECTION 2 — Journal Quotidien des Trajets
              </div>
              <table className="w-full border-collapse border border-slate-400 text-[11px] text-center">
                <thead>
                  <tr className="bg-[#1e3a8a] text-white font-semibold">
                    <th className="p-1.5 border border-slate-400 w-8">N°</th>
                    <th className="p-1.5 border border-slate-400 w-20">Date</th>
                    <th className="p-1.5 border border-slate-400">Client</th>
                    <th className="p-1.5 border border-slate-400">N° Conteneur / BL</th>
                    <th className="p-1.5 border border-slate-400 w-20">Type (20/40/Reefer)</th>
                    <th className="p-1.5 border border-slate-400">Départ</th>
                    <th className="p-1.5 border border-slate-400">Destination</th>
                    <th className="p-1.5 border border-slate-400 w-16">Km parcourus</th>
                    <th className="p-1.5 border border-slate-400 w-16">Carburant (L)</th>
                    <th className="p-1.5 border border-slate-400 w-16">Frais de route</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t, idx) => (
                    <tr key={t.id} className="odd:bg-white even:bg-slate-50">
                      <td className="p-1.5 border border-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-400">{t.date}</td>
                      <td className="p-1.5 border border-slate-400 text-left">{t.client}</td>
                      <td className="p-1.5 border border-slate-400 font-mono text-[10px]">{t.noConteneurBL}</td>
                      <td className="p-1.5 border border-slate-400">{t.typeConteneur}</td>
                      <td className="p-1.5 border border-slate-400 text-left">{t.depart}</td>
                      <td className="p-1.5 border border-slate-400 text-left">{t.destination}</td>
                      <td className="p-1.5 border border-slate-400 font-semibold">{t.kmParcourus || ''}</td>
                      <td className="p-1.5 border border-slate-400 font-semibold">{t.carburantL || ''}</td>
                      <td className="p-1.5 border border-slate-400 font-semibold">{t.fraisRoute ? formatFCFA(t.fraisRoute) : ''}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows to mimic the printed 12-row table structure */}
                  {Array.from({ length: Math.max(0, 10 - trips.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                      <td className="p-2 border border-slate-400">&nbsp;</td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                      <td className="p-2 border border-slate-400"></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 font-bold text-xs">
                    <td colSpan={7} className="p-2 border border-slate-400 text-right uppercase">
                      TOTAL
                    </td>
                    <td className="p-2 border border-slate-400 font-bold text-blue-900">{totalKm}</td>
                    <td className="p-2 border border-slate-400 font-bold text-blue-900">{totalFuel}</td>
                    <td className="p-2 border border-slate-400 font-bold text-emerald-800">{formatFCFA(totalFrais)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Container Totals */}
            <table className="w-full border-collapse border border-slate-400 text-xs mb-6">
              <tbody>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-1.5 w-3/4 border border-slate-400">
                    Total de conteneurs enlevés au port :
                  </td>
                  <td className="px-3 py-1.5 border border-slate-400 font-bold text-center">
                    {tripStats.totalEnlevesPort}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-1.5 border border-slate-400">
                    Total de conteneurs livrés au destinataire :
                  </td>
                  <td className="px-3 py-1.5 border border-slate-400 font-bold text-center">
                    {tripStats.totalLivresDestinataire}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-1.5 border border-slate-400">
                    Conteneurs vides retournés :
                  </td>
                  <td className="px-3 py-1.5 border border-slate-400 font-bold text-center">
                    {tripStats.conteneursVidesRetournes}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SECTION 3 Header preview */}
            <div>
              <div className="bg-[#1e3a8a] text-white font-bold text-xs uppercase px-3 py-1.5 mb-1">
                SECTION 3 — Diagnostic du Véhicule et Défauts Identifiés
              </div>
              <p className="text-[10px] text-slate-600 italic">
                (Cochez les défauts constatés durant la semaine — conforme à la norme DVIR. Pas d'écriture requise.)
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-400">Page 1 / 4</div>
        </div>

        {/* PAGE 2 / 4 */}
        <div className="bg-white min-h-[297mm] flex flex-col justify-between border-b-2 border-slate-300 print:border-none pb-8 print:pb-0 mb-8 print:mb-0 print:break-after-page pt-4">
          <div>
            <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-4">
              <span className="text-xs font-bold text-[#1e3a8a]">
                YM-TRANSIT — RAPPORT HEBDOMADAIRE DU CHAUFFEUR
              </span>
              <span className="text-[10px] text-slate-500 font-bold">Page 2 / 4</span>
            </div>

            {/* AUCUN DEFAUT Checkbox Box */}
            <div className="border border-slate-400 p-2.5 mb-4 text-xs font-bold bg-slate-50 flex items-center gap-2">
              <span className="inline-block w-4 h-4 border border-slate-600 text-center leading-3 font-bold">
                {report.aucunDefautConstate ? '✓' : ''}
              </span>
              <span>AUCUN DÉFAUT CONSTATÉ CETTE SEMAINE — véhicule conforme</span>
            </div>

            {/* DVIR Grid Page 2 Categories */}
            <table className="w-full border-collapse border border-slate-400 text-[10px]">
              <thead>
                <tr className="bg-[#1e3a8a] text-white font-bold text-center">
                  <th className="p-1.5 border border-slate-400 w-12">Constaté</th>
                  <th className="p-1.5 border border-slate-400 text-left">Défaut / Anomalie</th>
                  <th className="p-1.5 border border-slate-400 w-28">Gravité</th>
                  <th className="p-1.5 border border-slate-400 w-36">Action prise</th>
                  <th className="p-1.5 border border-slate-400 w-20">Date</th>
                  <th className="p-1.5 border border-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_DEFECT_CATEGORIES.slice(0, 5).map((cat) => (
                  <React.Fragment key={cat.category}>
                    <tr className="bg-blue-100 font-bold text-[#1e3a8a] text-xs">
                      <td colSpan={6} className="p-1 px-2 border border-slate-400 uppercase">
                        {cat.category}
                      </td>
                    </tr>
                    {cat.items.map((item) => {
                      const defect = defects[item.id];
                      return (
                        <tr key={item.id} className="border-b border-slate-300">
                          <td className="p-1 border border-slate-400 text-center font-bold">
                            {defect?.constate ? '☑' : '☐'}
                          </td>
                          <td className="p-1.5 border border-slate-400 font-medium">{item.name}</td>
                          <td className="p-1 border border-slate-400 text-[9px]">
                            {defect?.constate ? (
                              <span className="font-bold">{defect.gravite}</span>
                            ) : (
                              '☐ Mineure  ☐ Majeure  ☐ Critique'
                            )}
                          </td>
                          <td className="p-1 border border-slate-400 text-[9px]">
                            {defect?.constate ? (
                              <span className="font-bold">{defect.actionPrise}</span>
                            ) : (
                              '☐ Sur place  ☐ Mécanicien  ☐ Immobilisé'
                            )}
                          </td>
                          <td className="p-1 border border-slate-400 text-center">
                            {defect?.constate ? defect.date : ''}
                          </td>
                          <td className="p-1 border border-slate-400">{defect?.constate ? defect.notes : ''}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right text-[10px] text-slate-400">Page 2 / 4</div>
        </div>

        {/* PAGE 3 / 4 */}
        <div className="bg-white min-h-[297mm] flex flex-col justify-between border-b-2 border-slate-300 print:border-none pb-8 print:pb-0 mb-8 print:mb-0 print:break-after-page pt-4">
          <div>
            <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-4">
              <span className="text-xs font-bold text-[#1e3a8a]">
                YM-TRANSIT — RAPPORT HEBDOMADAIRE DU CHAUFFEUR
              </span>
              <span className="text-[10px] text-slate-500 font-bold">Page 3 / 4</span>
            </div>

            {/* Remaining DVIR Categories */}
            <table className="w-full border-collapse border border-slate-400 text-[10px] mb-6">
              <thead>
                <tr className="bg-[#1e3a8a] text-white font-bold text-center">
                  <th className="p-1.5 border border-slate-400 w-12">Constaté</th>
                  <th className="p-1.5 border border-slate-400 text-left">Défaut / Anomalie</th>
                  <th className="p-1.5 border border-slate-400 w-28">Gravité</th>
                  <th className="p-1.5 border border-slate-400 w-36">Action prise</th>
                  <th className="p-1.5 border border-slate-400 w-20">Date</th>
                  <th className="p-1.5 border border-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_DEFECT_CATEGORIES.slice(5).map((cat) => (
                  <React.Fragment key={cat.category}>
                    <tr className="bg-blue-100 font-bold text-[#1e3a8a] text-xs">
                      <td colSpan={6} className="p-1 px-2 border border-slate-400 uppercase">
                        {cat.category}
                      </td>
                    </tr>
                    {cat.items.map((item) => {
                      const defect = defects[item.id];
                      return (
                        <tr key={item.id} className="border-b border-slate-300">
                          <td className="p-1 border border-slate-400 text-center font-bold">
                            {defect?.constate ? '☑' : '☐'}
                          </td>
                          <td className="p-1.5 border border-slate-400 font-medium">{item.name}</td>
                          <td className="p-1 border border-slate-400 text-[9px]">
                            {defect?.constate ? (
                              <span className="font-bold">{defect.gravite}</span>
                            ) : (
                              '☐ Mineure  ☐ Majeure  ☐ Critique'
                            )}
                          </td>
                          <td className="p-1 border border-slate-400 text-[9px]">
                            {defect?.constate ? (
                              <span className="font-bold">{defect.actionPrise}</span>
                            ) : (
                              '☐ Sur place  ☐ Mécanicien  ☐ Immobilisé'
                            )}
                          </td>
                          <td className="p-1 border border-slate-400 text-center">
                            {defect?.constate ? defect.date : ''}
                          </td>
                          <td className="p-1 border border-slate-400">{defect?.constate ? defect.notes : ''}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Mechanic Confirmation */}
            <div className="border border-slate-400 p-3 text-xs mb-6 bg-slate-50">
              <span className="font-bold block mb-1">Confirmation mécanicien (si défaut signalé) :</span>
              <div className="flex justify-between items-center gap-4">
                <div>
                  Nom du mécanicien informé :{' '}
                  <span className="font-semibold underline">
                    {mechanicVerif.nomMecanicien || '____________________'}
                  </span>
                </div>
                <div>
                  Date :{' '}
                  <span className="font-semibold underline">{mechanicVerif.date || '____ / ____ / ______'}</span>
                </div>
              </div>
            </div>

            {/* Verification List (cocher ✔) */}
            <div className="border border-slate-400 p-3 text-xs mb-6">
              <span className="font-bold block mb-2">Liste de vérification (cocher ✔) :</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {Object.keys(checklist).map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <span>{checklist[item] ? '☑' : '☐'}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4 Header */}
            <div>
              <div className="bg-[#1e3a8a] text-white font-bold text-xs uppercase px-3 py-1.5 mb-2">
                SECTION 4 — Observations et Suggestions Personnelles du Chauffeur
              </div>
              <p className="text-[10px] text-slate-600 italic mb-4">
                Zone de texte libre — la sincérité est encouragée. C'est ici que se trouve souvent l'or opérationnel.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold block text-slate-800">
                    • Problèmes d'itinéraires, de trafic ou d'infrastructure :
                  </span>
                  <p className="p-2 border border-slate-300 min-h-[35px] bg-slate-50 rounded mt-1">
                    {observations.itineraireTrafic || '—'}
                  </p>
                </div>

                <div>
                  <span className="font-bold block text-slate-800">• Problèmes avec les clients / destinataires :</span>
                  <p className="p-2 border border-slate-300 min-h-[35px] bg-slate-50 rounded mt-1">
                    {observations.clientsDestinataires || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-400">Page 3 / 4</div>
        </div>

        {/* PAGE 4 / 4 */}
        <div className="bg-white min-h-[297mm] flex flex-col justify-between pt-4">
          <div>
            <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-4">
              <span className="text-xs font-bold text-[#1e3a8a]">
                YM-TRANSIT — RAPPORT HEBDOMADAIRE DU CHAUFFEUR
              </span>
              <span className="text-[10px] text-slate-500 font-bold">Page 4 / 4</span>
            </div>

            {/* SECTION 4 Continuation */}
            <div className="space-y-4 text-xs mb-8">
              <div>
                <span className="font-bold block text-slate-800">• Suggestions pour améliorer les opérations :</span>
                <p className="p-2 border border-slate-300 min-h-[45px] bg-slate-50 rounded mt-1">
                  {observations.suggestionsOperations || '—'}
                </p>
              </div>

              <div>
                <span className="font-bold block text-slate-800">• Besoins de formation ou d'équipement :</span>
                <p className="p-2 border border-slate-300 min-h-[45px] bg-slate-50 rounded mt-1">
                  {observations.besoinsFormation || '—'}
                </p>
              </div>

              <div>
                <span className="font-bold block text-slate-800">• Commentaires généraux :</span>
                <p className="p-2 border border-slate-300 min-h-[45px] bg-slate-50 rounded mt-1">
                  {observations.commentairesGeneraux || '—'}
                </p>
              </div>
            </div>

            {/* SECTION 5 — Transmission Directe Administration & Superviseur */}
            <div>
              <div className="bg-[#1e3a8a] text-white font-bold text-xs uppercase px-3 py-1.5 mb-0">
                TRANSMISSION DIRECTE & VALIDATION ADMINISTRATION
              </div>
              <div className="border border-slate-400 p-4 bg-slate-50 text-xs rounded-b space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                    <span className="font-bold text-emerald-900">
                      Rapport transmis automatiquement à l'Administration & au Superviseur
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {report.isSubmitted
                      ? `Transmis le ${new Date(report.submittedAt || '').toLocaleString('fr-FR')}`
                      : 'Prêt pour transmission immédiate'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[11px] pt-2 border-t border-slate-300 text-slate-700">
                  <div>
                    <span className="font-bold block text-slate-900">Chauffeur Émetteur :</span>
                    <span>{report.driverInfo.nomChauffeur || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">Camion Assigné :</span>
                    <span>{report.driverInfo.immatriculation || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">Superviseur Destinataire :</span>
                    <span>Service Flotte YM-TRANSIT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-400">Page 4 / 4</div>
        </div>
      </div>
    </div>
  );
};
