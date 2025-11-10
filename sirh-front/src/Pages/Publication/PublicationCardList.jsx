import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublications } from '../../Redux/Slices/publicationSlice';
import { Icon } from '@iconify/react';

export default function PublicationCardList() {
  const dispatch = useDispatch();
  const { items: publications, loading } = useSelector(state => state.publications);

  useEffect(() => {
    dispatch(fetchPublications());
  }, [dispatch]);

  // Filtrer uniquement les actualités (type news ou actualite)
  const actualites = publications.filter(pub => pub.type === 'news' || pub.type === 'actualite');

  if (loading === 'loading') {
    return <div className="text-center py-10 text-gray-500">Chargement…</div>;
  }

  return (
    <div className="container py-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Icon icon="mdi:newspaper" className="text-blue-600" /> Actualités
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actualites.length === 0 && <div className="col-span-full text-gray-500">Aucune actualité disponible.</div>}
        {actualites.map(pub => (
          <div key={pub.id} className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-3 border hover:shadow-2xl transition">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:newspaper" className="text-blue-600" />
              <span className="font-semibold text-lg">{pub.titre}</span>
            </div>
            <div className="text-gray-700 mb-2 whitespace-pre-line" style={{ lineHeight: 1.6 }}>{pub.texte}</div>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
              <span>Créé le {new Date(pub.created_at).toLocaleDateString()}</span>
              {pub.statut !== 'publie' && <span className="text-yellow-700 font-semibold">Non publié</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
