import { Icon } from "@iconify/react/dist/iconify.js";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../Redux/Slices/userSlice'; 
import { fetchSocietes } from "../Redux/Slices/societeSlice"; // Ajouter l'importation pour fetchSocietes
import { fetchDepartments } from "../Redux/Slices/departementSlice"; // Assurez-vous que fetchDepartments est importé si ce n'est pas déjà le cas

const ViewProfileLayer = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { status, error } = useSelector((state) => state.users);
  const { items: departments } = useSelector((state) => state.departments);
  const { items: societes } = useSelector(state => state.societes); // Récupérer les sociétés

  const getDepartmentName = (id) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.nom : "Département inconnu";
  };

  const getSocieteName = (id) => { // Fonction pour obtenir le nom de la société
    const soc = societes.find((s) => s.id === id);
    return soc ? soc.nom : "Société inconnue";
  };

  // État local pour le formulaire
  const [formData, setFormData] = useState({});
  const [imagePreview, setImagePreview] = useState(
    useEffect(() => {
      if (user?.picture) {
        setImagePreview(`${apiUrl}storage/profile_picture/${user.picture}`);
      } else {
        setImagePreview("assets/images/user-grid/user-grid-img13.png");
      }
      console.log(imagePreview);
    }, [user])
    
  );
  
 
  
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Initialiser le formulaire avec les données utilisateur
  useEffect(() => {
    dispatch(fetchSocietes()); // Dispatch pour récupérer les sociétés
    dispatch(fetchDepartments()); // Dispatch pour récupérer les départements
    if (user) {
      setFormData({
        name: user.name || '',
        prenom: user.prenom || '',
        email: user.email || '',
        tel: user.tel || '',
        departement_id: user.departement_id || '',
        statut: user.statut || '',
        date_naissance: user.date_naissance || '',
        rib: user.rib || '',
        cin: user.cin || '',
        situationFamiliale: user.situationFamiliale || '',
        nbEnfants: user.nbEnfants || 0,
        adresse: user.adresse || '',
        typeContrat: user.typeContrat || '',
        role: user.role || '',
        societe_id: user.societe_id || '' // Ajouter societe_id
      });
    }
  }, [user, dispatch]);

  // Gestion des changements dans le formulaire
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
  };

  // Toggle function for password field
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  // Gestion de l'upload d'image
  const readURL = (input) => {
    if (input.target.files && input.target.files[0]) {
      const file = input.target.files[0];
      setProfilePicture(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Soumission du formulaire de profil
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Préparer les données pour la mise à jour
    const updateData = {
      id: user.id,
      ...formData
    };
    
    // Ajouter l'image si elle a été modifiée
    if (profilePicture) {
      updateData.picture = profilePicture;
    }
    
    // Dispatcher l'action de mise à jour
    dispatch(updateUser(updateData))
      .unwrap()
      .then(() => {
        setSuccessMessage("Profil mis à jour avec succès!");
        setTimeout(() => setSuccessMessage(""), 3000);
      })
      .catch((err) => {
        console.error("Erreur lors de la mise à jour:", err);
      });
  };

  // Soumission du formulaire de mot de passe
  const handlePasswordChange = (e) => {
    e.preventDefault();
    
    // Validation des mots de passe
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    
    // Réinitialiser l'erreur
    setPasswordError("");
    
    // Préparer les données pour la mise à jour
    const updateData = {
      id: user.id,
      password: newPassword
    };
    
    // Dispatcher l'action de mise à jour
    dispatch(updateUser(updateData))
      .unwrap()
      .then(() => {
        setSuccessMessage("Mot de passe mis à jour avec succès!");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMessage(""), 3000);
      })
      .catch((err) => {
        console.error("Erreur lors de la mise à jour du mot de passe:", err);
      });
  };

  if (!user) {
    return <p>Utilisateur non trouvé.</p>;
  }

  return (
    <div className='row gy-4'>
      <div className='col-lg-4'>
        <div className='user-grid-card position-relative border radius-16 overflow-hidden bg-base h-100'>
          <img
            src='https://img.freepik.com/free-photo/millennial-asia-businessmen-businesswomen-meeting-brainstorming-ideas-about-new-paperwork-project-colleagues-working-together-planning-success-strategy-enjoy-teamwork-small-modern-night-office_7861-2386.jpg?t=st=1746285329~exp=1746288929~hmac=3fcf64f9159186b3557a7aa18cbf39589dad8764d99a98898010e57c933bfd79&w=1380'
            alt='WowDash React Vite'
            className='w-100 object-fit-cover'
          />
          <div className='pb-24 ms-16 mb-24 me-16  mt--100'>
            <div className='text-center border border-top-0 border-start-0 border-end-0'>
              <img
                src={imagePreview}
                alt='WowDash React Vite'
                className='border br-white border-width-2-px w-200-px h-200-px rounded-circle object-fit-cover'
              />
              <h6 className='mb-0 mt-16'>{formData.name} {formData.prenom}</h6>
              <span className='text-secondary-light mb-16'>
                {formData.email}
              </span>
            </div>
            <div className='mt-24'>
              <h6 className='text-xl mb-16'>Informations Personnelles</h6>
              <ul>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Nom Complet
                  </span>
                  <span className='text-md text-primary-light'>: {formData.name} {formData.prenom}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Email
                  </span>
                  <span className='text-md text-primary-light'>: {formData.email}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Téléphone
                  </span>
                  <span className='text-md text-primary-light'>: {formData.tel}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Département
                  </span>
                  <span className='text-md text-primary-light'>: {getDepartmentName(formData.departement_id)}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Société
                  </span>
                  <span className='text-md text-primary-light'>: {getSocieteName(formData.societe_id)}</span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Statut
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.statut}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Date de Naissance
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.date_naissance}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    RIB
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.rib}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    CIN
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.cin}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Situation Familiale
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.situationFamiliale}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Nombre d&apos;Enfants
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.nbEnfants}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Adresse
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.adresse}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-1 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Type de Contrat
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.typeContrat}
                  </span>
                </li>
                <li className='d-flex align-items-center'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>
                    Rôle
                  </span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {formData.role}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className='col-lg-8'>
        <div className='card h-100'>
          <div className='card-body p-24'>
            {successMessage && (
              <div className="alert alert-success mb-3">{successMessage}</div>
            )}
            {error && (
              <div className="alert alert-danger mb-3">
                {typeof error === 'string' ? error : 'Une erreur est survenue lors de la modification du profil.'}
              </div>
            )}
            
            <ul
              className='nav border-gradient-tab nav-pills mb-20 d-inline-flex'
              id='pills-tab'
              role='tablist'
            >
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center px-24 active'
                  id='pills-edit-profile-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-edit-profile'
                  type='button'
                  role='tab'
                  aria-controls='pills-edit-profile'
                  aria-selected='true'
                >
                  Modifier le Profil
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link d-flex align-items-center px-24'
                  id='pills-change-passwork-tab'
                  data-bs-toggle='pill'
                  data-bs-target='#pills-change-passwork'
                  type='button'
                  role='tab'
                  aria-controls='pills-change-passwork'
                  aria-selected='false'
                  tabIndex={-1}
                >
                  Changer le Mot de Passe
                </button>
              </li>
            </ul>
            <div className='tab-content' id='pills-tabContent'>
              <div
                className='tab-pane fade show active'
                id='pills-edit-profile'
                role='tabpanel'
                aria-labelledby='pills-edit-profile-tab'
                tabIndex={0}
              >
                <h6 className='text-md text-primary-light mb-16'>
                  Photo de Profil
                </h6>
                {/* Upload Image Start */}
                <div className='mb-24 mt-16'>
                  <div className='avatar-upload'>
                    <div className='avatar-edit position-absolute bottom-0 end-0 me-24 mt-16 z-1 cursor-pointer'>
                      <input
                        type='file'
                        id='imageUpload'
                        accept='.png, .jpg, .jpeg'
                        hidden
                        onChange={readURL}
                      />
                      <label
                        htmlFor='imageUpload'
                        className='w-32-px h-32-px d-flex justify-content-center align-items-center bg-primary-50 text-primary-600 border border-primary-600 bg-hover-primary-100 text-lg rounded-circle'
                      >
                        <Icon
                          icon='solar:camera-outline'
                          className='icon'
                        ></Icon>
                      </label>
                    </div>
                    <div className='avatar-preview'>
                      <div
                        id='imagePreview'
                        style={{
                          // backgroundImage: `url(${imagePreview})`,
                          backgroundImage: imagePreview ? `url(${imagePreview})` : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Upload Image End */}
                <form onSubmit={handleSubmit}>
                  <div className='row'>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='name'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Nom
                          <span className='text-danger-600'>*</span>
                        </label>
                        <input
                          type='text'
                          className='form-control radius-8'
                          id='name'
                          placeholder='Entrez le nom'
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled
                          required
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='prenom'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Prénom
                          <span className='text-danger-600'>*</span>
                        </label>
                        <input
                          type='text'
                          className='form-control radius-8'
                          id='prenom'
                          placeholder='Entrez le prénom'
                          value={formData.prenom}
                          onChange={handleInputChange}
                          required
                          disabled
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='email'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Email <span className='text-danger-600'>*</span>
                        </label>
                        <input
                          type='email'
                          className='form-control radius-8'
                          id='email'
                          placeholder="Entrez l\'adresse email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          disabled
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='tel'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Téléphone
                        </label>
                        <input
                          type='tel'
                          className='form-control radius-8'
                          id='tel'
                          placeholder='Entrez le numéro de téléphone'
                          value={formData.tel}
                          onChange={handleInputChange}
                          disabled
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='departement_id'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Département
                          <span className='text-danger-600'>*</span>{" "}
                        </label>
                        <input
                          type="text"
                          className='form-control radius-8'
                          id='departement_id'
                          value={getDepartmentName(formData.departement_id)}
                          readOnly
                          required
                          disabled
                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='statut'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Statut
                          <span className='text-danger-600'>*</span>{" "}
                        </label>
                        <input
                          type="text"
                          className='form-control radius-8'
                          id='statut'
                          value={formData.statut}
                          readOnly
                          required
                          
                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='date_naissance'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Date de Naissance
                        </label>
                        <input
                          type='date'
                          className='form-control radius-8'
                          id='date_naissance'
                          value={formData.date_naissance}
                          onChange={handleInputChange}
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='rib'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          RIB
                        </label>
                        <input
                          type='text'
                          className='form-control radius-8'
                          id='rib'
                          placeholder='Entrez le RIB'
                          value={formData.rib}
                          onChange={handleInputChange}
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='cin'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          CIN
                        </label>
                        <input
                          type='text'
                          className='form-control radius-8'
                          id='cin'
                          placeholder='Entrez le CIN'
                          value={formData.cin}
                          onChange={handleInputChange}
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='situationFamiliale'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Situation Familiale
                        </label>
                        <select
                          className='form-control radius-8 form-select'
                          id='situationFamiliale'
                          value={formData.situationFamiliale}
                          onChange={handleInputChange}
                          readOnly

                        >
                          <option value='' disabled>
                            Sélectionner une situation
                          </option>
                          <option value='Célibataire'>Célibataire</option>
                          <option value='Marié'>Marié</option>
                          <option value='Divorcé'>Divorcé</option>
                        </select>
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='nbEnfants'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Nombre d&apos;Enfants
                        </label>
                        <input
                          type='number'
                          className='form-control radius-8'
                          id='nbEnfants'
                          placeholder="Entrez le nombre d\'enfants"
                          value={formData.nbEnfants}
                          onChange={handleInputChange}
                          readOnly

                        />
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className='mb-20'>
                        <label
                          htmlFor='societe'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Société
                        </label>
                        <input
                          type='text'
                          className='form-control radius-8'
                          id='societe_id'
                          placeholder="societe"
                          value={getSocieteName(formData.societe_id)}
                          onChange={handleInputChange}
                          readOnly
                        />
                      </div>
                      </div>
                    <div className='col-sm-12'>
                      <div className='mb-20'>
                        <label
                          htmlFor='adresse'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Adresse
                        </label>
                        <textarea
                          className='form-control radius-8'
                          id='adresse'
                          placeholder='Entrez l&apos;adresse'
                          value={formData.adresse}
                          onChange={handleInputChange}
                          readOnly

                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='typeContrat'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Type de Contrat
                        </label>
                        <input
                          type="text"
                          className='form-control radius-8'
                          id='typeContrat'
                          value={formData.typeContrat}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className='col-sm-6'>
                      <div className='mb-20'>
                        <label
                          htmlFor='role'
                          className='form-label fw-semibold text-primary-light text-sm mb-8'
                        >
                          Rôle
                        </label>
                        <input
                          type="text"
                          className='form-control radius-8'
                          id='role'
                          value={formData.role}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  <div className='d-flex align-items-center justify-content-center gap-3'>
                    <button
                      type='button'
                      className='border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-56 py-11 radius-8'
                      onClick={() => window.location.reload()}
                    >
                      Annuler
                    </button>
                    <button
                      type='submit'
                      className='btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8'
                      disabled={status === 'loading'}
                    >
                      {status === 'loading' ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </div>
              <div
                className='tab-pane fade'
                id='pills-change-passwork'
                role='tabpanel'
                aria-labelledby='pills-change-passwork-tab'
                tabIndex='0'
              >
                {passwordError && (
                  <div className="alert alert-danger mb-3">{passwordError}</div>
                )}
                <form onSubmit={handlePasswordChange}>
                  <div className='mb-20'>
                    <label
                      htmlFor='your-password'
                      className='form-label fw-semibold text-primary-light text-sm mb-8'
                    >
                      Nouveau Mot de Passe <span className='text-danger-600'>*</span>
                    </label>
                    <div className='position-relative'>
                      <input
                        type={passwordVisible ? "text" : "password"}
                        className='form-control radius-8'
                        id='your-password'
                        placeholder='Entrez le nouveau mot de passe*'
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <span
                        className={`toggle-password ${
                          passwordVisible ? "ri-eye-off-line" : "ri-eye-line"
                        } cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light`}
                        onClick={togglePasswordVisibility}
                      ></span>
                    </div>
                  </div>

                  <div className='mb-20'>
                    <label
                      htmlFor='confirm-password'
                      className='form-label fw-semibold text-primary-light text-sm mb-8'
                    >
                      Confirmer le Mot de Passe <span className='text-danger-600'>*</span>
                    </label>
                    <div className='position-relative'>
                      <input
                        type={confirmPasswordVisible ? "text" : "password"}
                        className='form-control radius-8'
                        id='confirm-password'
                        placeholder='Confirmez le mot de passe*'
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <span
                        className={`toggle-password ${
                          confirmPasswordVisible
                            ? "ri-eye-off-line"
                            : "ri-eye-line"
                        } cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light`}
                        onClick={toggleConfirmPasswordVisibility}
                      ></span>
                    </div>
                  </div>
                  <div className='d-flex align-items-center justify-content-center gap-3 mt-24'>
                    <button
                      type='button'
                      className='border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-56 py-11 radius-8'
                      onClick={() => {
                        setNewPassword("");
                        setConfirmPassword("");
                        setPasswordError("");
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type='submit'
                      className='btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8'
                      disabled={status === 'loading'}
                    >
                      {status === 'loading' ? 'Mise à jour...' : 'Mettre à jour le Mot de Passe'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfileLayer;