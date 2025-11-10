import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublications } from '../../Redux/Slices/publicationSlice';
import SondageVote from './SondageVote';
import { Icon } from '@iconify/react';

// Palette de couleurs pour la border de chaque card
const borderColors = [
  'border-green-400',
  'border-blue-400',
  'border-yellow-400',
  'border-pink-400',
  'border-purple-400',
  'border-orange-400',
];
const getBorderColor = idx => borderColors[idx % borderColors.length];

export default function SondageList() {
  const dispatch = useDispatch();
  const { items: publications, loading } = useSelector(state => state.publications);

  useEffect(() => {
    dispatch(fetchPublications());
  }, [dispatch]);

  const sondages = publications.filter(pub => pub.type === 'sondage');

  if (loading === 'loading') {
    return <div className="text-center py-10 text-gray-500">Chargement…</div>;
  }

  return (
    <div className="container py-6">
      <h2 className="text-2xl font-extrabold mb-8 flex items-center gap-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-yellow-600 to-pink-500">
        <Icon icon="mdi:poll" className="text-yellow-600" /> Sondages
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sondages.length === 0 && (
          <div className="col-span-full text-gray-400 text-center font-semibold">Aucun sondage disponible.</div>
        )}
        {sondages.map((pub, idx) => (
          <div
            key={pub.id}
            className={`bg-white border-2 ${getBorderColor(idx)} shadow-lg rounded-3xl p-0 flex flex-col group transition-all hover:scale-[1.015] hover:shadow-2xl`}
          >
            <div className="rounded-t-3xl px-6 py-4 flex items-center gap-2 bg-gray-50 border-b">
              <Icon icon="mdi:poll" className="text-2xl text-yellow-700 drop-shadow" />
              <span className="font-bold text-lg md:text-xl text-gray-900 drop-shadow">{pub.titre}</span>
            </div>
            <div className="flex-1 flex flex-col justify-between px-6 py-5">
              <div className="text-gray-800 mb-2 whitespace-pre-line text-base leading-relaxed">{pub.texte}</div>
              <SondageVote publication={pub} canVote={pub.statut === 'publie'} />
              <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                <span>Créé le {new Date(pub.created_at).toLocaleDateString()}</span>
                {pub.statut !== 'publie' && (
                  <span className="text-yellow-700 font-semibold">Non ouvert</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
