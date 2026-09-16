import React, { useState, useRef, useEffect } from 'react';
import { DriverObservations, AudioNote, PhotoEvidence } from '../types';
import { uploadFile, ApiError } from '../lib/api';
import {
  Navigation,
  Users,
  Lightbulb,
  GraduationCap,
  FileText,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Camera,
  Image as ImageIcon,
  X,
  Volume2,
  Check,
  Eye,
  Loader2,
  AlertCircle,
  Sparkles,
  Upload
} from 'lucide-react';

interface Section4ObservationsProps {
  observations: DriverObservations;
  onChange: (updated: DriverObservations) => void;
  isSubmitted?: boolean;
}

type ObservationFieldKey =
  | 'itineraireTrafic'
  | 'clientsDestinataires'
  | 'suggestionsOperations'
  | 'besoinsFormation'
  | 'commentairesGeneraux';

interface FieldConfig {
  key: ObservationFieldKey;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: string;
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'itineraireTrafic',
    label: "1. Problèmes d'itinéraires, de trafic ou d'infrastructure",
    placeholder: "Ex: Travaux majeurs sur l'A1, déviations, ralentissement au péage...",
    icon: Navigation,
    color: 'border-blue-200 bg-blue-50/30',
    badgeColor: 'bg-blue-600 text-white',
  },
  {
    key: 'clientsDestinataires',
    label: '2. Problèmes avec les clients / destinataires',
    placeholder: 'Ex: Attente prolongée au quai n°4, problème de déchargement, protocole d’accès...',
    icon: Users,
    color: 'border-indigo-200 bg-indigo-50/30',
    badgeColor: 'bg-indigo-600 text-white',
  },
  {
    key: 'suggestionsOperations',
    label: '3. Suggestions pour améliorer les opérations',
    placeholder: 'Ex: Modifier l’horaire de chargement pour éviter les embouteillages du matin...',
    icon: Lightbulb,
    color: 'border-amber-200 bg-amber-50/30',
    badgeColor: 'bg-amber-600 text-white',
  },
  {
    key: 'besoinsFormation',
    label: "4. Besoins de formation ou d'équipement",
    placeholder: 'Ex: Gants de sécurité renforcés, chaussures de sécurité, révision de la sangle...',
    icon: GraduationCap,
    color: 'border-emerald-200 bg-emerald-50/30',
    badgeColor: 'bg-emerald-600 text-white',
  },
  {
    key: 'commentairesGeneraux',
    label: '5. Commentaires généraux',
    placeholder: 'Remarques complémentaires sur le déroulement de la semaine, incidents divers...',
    icon: FileText,
    color: 'border-purple-200 bg-purple-50/30',
    badgeColor: 'bg-purple-600 text-white',
  },
];

export const Section4Observations: React.FC<Section4ObservationsProps> = ({
  observations,
  onChange,
  isSubmitted,
}) => {
  // Field targeted for active recording or camera capture
  const [activeRecordingField, setActiveRecordingField] = useState<ObservationFieldKey | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [activeDictatingField, setActiveDictatingField] = useState<ObservationFieldKey | null>(null);
  
  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isUploadingVoiceNote, setIsUploadingVoiceNote] = useState(false);
  const [isUploadingObsPhoto, setIsUploadingObsPhoto] = useState(false);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Photo Capture State
  const activePhotoFieldRef = useRef<ObservationFieldKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<PhotoEvidence | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const voiceNotes = observations.voiceNotes || [];
  const photos = observations.photos || [];

  const handleTextChange = (field: ObservationFieldKey, value: string) => {
    onChange({
      ...observations,
      [field]: value,
    });
  };

  // ==========================================
  // SPEECH-TO-TEXT LIVE DICTATION FOR SPECIFIC FIELD
  // ==========================================
  const toggleLiveDictation = (fieldKey: ObservationFieldKey) => {
    if (activeDictatingField === fieldKey) {
      // Stop dictation
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setActiveDictatingField(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("La dictée vocale directe n'est pas supportée par ce navigateur. Utilisez le bouton d'enregistrement vocal.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          const currentVal = observations[fieldKey] || '';
          handleTextChange(
            fieldKey,
            currentVal ? `${currentVal} ${transcript.trim()}` : transcript.trim()
          );
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setActiveDictatingField(null);
      };

      recognition.onend = () => {
        setActiveDictatingField(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setActiveDictatingField(fieldKey);
    } catch (err) {
      console.error('Dictation error:', err);
      alert('Impossible d’activer la dictée vocale.');
    }
  };

  // ==========================================
  // VOICE RECORDING FOR SPECIFIC FIELD
  // ==========================================
  const startFieldRecording = async (fieldKey: ObservationFieldKey) => {
    setAudioError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current as BlobPart[], { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        setIsUploadingVoiceNote(true);
        setAudioError(null);
        try {
          const url = await uploadFile(audioBlob, `voice_${Date.now()}.webm`);
          const newAudioNote: AudioNote = {
            id: `voice_${Date.now()}`,
            dataUrl: url,
            durationSeconds: recordingSeconds > 0 ? recordingSeconds : 1,
            fieldKey: fieldKey,
            date: new Date().toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
          };

          onChange({
            ...observations,
            voiceNotes: [...(observations.voiceNotes || []), newAudioNote],
          });
        } catch (err) {
          setAudioError(err instanceof ApiError ? err.message : "Échec de l'envoi de la note vocale.");
        } finally {
          setIsUploadingVoiceNote(false);
        }
      };

      recorder.start();
      setActiveRecordingField(fieldKey);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setAudioError("Impossible d'accéder au microphone. Autorisez le micro dans votre navigateur.");
    }
  };

  const stopFieldRecording = () => {
    if (mediaRecorderRef.current && activeRecordingField) {
      mediaRecorderRef.current.stop();
      setActiveRecordingField(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelFieldRecording = () => {
    if (mediaRecorderRef.current && activeRecordingField) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setActiveRecordingField(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudioNote = (note: AudioNote) => {
    if (playingAudioId === note.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setPlayingAudioId(null);
      }
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(note.dataUrl);
    activeAudioRef.current = audio;

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.play();
    setPlayingAudioId(note.id);
  };

  const deleteAudioNote = (id: string) => {
    if (playingAudioId === id && activeAudioRef.current) {
      activeAudioRef.current.pause();
      setPlayingAudioId(null);
    }
    const updated = voiceNotes.filter((n) => n.id !== id);
    onChange({
      ...observations,
      voiceNotes: updated,
    });
  };

  // ==========================================
  // PHOTO CAPTURE & UPLOAD FOR SPECIFIC FIELD
  // ==========================================
  const triggerFileUploadForField = (fieldKey: ObservationFieldKey) => {
    activePhotoFieldRef.current = fieldKey;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const targetField = activePhotoFieldRef.current || 'commentairesGeneraux';
    const fileArray = Array.from(files);
    e.target.value = '';

    setIsUploadingObsPhoto(true);
    setAudioError(null);
    const newPhotos: PhotoEvidence[] = [];
    try {
      for (const file of fileArray) {
        const url = await uploadFile(file, file.name);
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          dataUrl: url,
          fieldKey: targetField,
          caption: '',
          date: new Date().toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
    } catch (err) {
      setAudioError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      if (newPhotos.length > 0) {
        onChange({
          ...observations,
          photos: [...(observations.photos || []), ...newPhotos],
        });
      }
      setIsUploadingObsPhoto(false);
    }
  };

  const openCameraForField = async (fieldKey: ObservationFieldKey) => {
    activePhotoFieldRef.current = fieldKey;
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      videoStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      // Fallback to input file
      triggerFileUploadForField(fieldKey);
      setCameraModalOpen(false);
    }
  };

  const captureCameraSnapshot = () => {
    if (!videoElementRef.current) return;
    const video = videoElementRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const targetField = activePhotoFieldRef.current || 'commentairesGeneraux';

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          setIsUploadingObsPhoto(true);
          setAudioError(null);
          try {
            const url = await uploadFile(blob, `photo_${Date.now()}.jpg`);
            const newPhoto: PhotoEvidence = {
              id: `photo_${Date.now()}`,
              dataUrl: url,
              fieldKey: targetField,
              caption: 'Photo de confirmation',
              date: new Date().toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
            onChange({
              ...observations,
              photos: [...(observations.photos || []), newPhoto],
            });
          } catch (err) {
            setAudioError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
          } finally {
            setIsUploadingObsPhoto(false);
          }
        },
        'image/jpeg',
        0.85
      );
    }

    closeCameraStream();
  };

  const closeCameraStream = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    setCameraModalOpen(false);
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    const updated = photos.map((p) => (p.id === id ? { ...p, caption } : p));
    onChange({
      ...observations,
      photos: updated,
    });
  };

  const deletePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    onChange({
      ...observations,
      photos: updated,
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Hidden File Input for Native Camera/File selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
      />

      {/* Section Header */}
      <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded">SECTION 4</span>
          <h2 className="font-semibold text-sm sm:text-base tracking-wide">
            Observations, Suggestions, Vocaux & Photos
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-300 font-medium">
          <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            <Mic className="w-3.5 h-3.5 text-rose-400" /> {voiceNotes.length} vocaux
          </span>
          <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            <Camera className="w-3.5 h-3.5 text-blue-400" /> {photos.length} photos
          </span>
        </div>
      </div>

      {audioError && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* 5 Distinct Observation Field Containers with Embedded Voice Dictation & Camera */}
      <div className="p-3 sm:p-5 space-y-4">
        {FIELD_CONFIGS.map((field) => {
          const IconComponent = field.icon;
          const fieldValue = observations[field.key] || '';
          const isRecordingThisField = activeRecordingField === field.key;
          const isDictatingThisField = activeDictatingField === field.key;

          // Filter photos & voice notes for this specific field
          const fieldVoiceNotes = voiceNotes.filter((v) => v.fieldKey === field.key || (!v.fieldKey && field.key === 'commentairesGeneraux'));
          const fieldPhotos = photos.filter((p) => p.fieldKey === field.key || (!p.fieldKey && field.key === 'commentairesGeneraux'));

          return (
            <div
              key={field.key}
              className={`rounded-xl border p-3 sm:p-4 transition-all shadow-2xs ${field.color}`}
            >
              {/* Field Header with Title & Embedded Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{field.label}</span>
                </label>

                {/* Quick Action Buttons for THIS specific field */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Live Dictation (Speech to Text) */}
                  <button
                    type="button"
                    onClick={() => toggleLiveDictation(field.key)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      isDictatingThisField
                        ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                    title="Dicter directement dans la zone de texte"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{isDictatingThisField ? 'Dictée en cours...' : 'Dictée'}</span>
                  </button>

                  {/* Record Voice Note */}
                  <button
                    type="button"
                    disabled={isUploadingVoiceNote}
                    onClick={() =>
                      isRecordingThisField ? stopFieldRecording() : startFieldRecording(field.key)
                    }
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                      isRecordingThisField
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                    title="Enregistrer un message vocal pour ce champ"
                  >
                    {isUploadingVoiceNote && !isRecordingThisField ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Mic className={`w-3 h-3 ${isRecordingThisField ? 'animate-ping' : ''}`} />
                    )}
                    <span>{isRecordingThisField ? 'Arrêter' : isUploadingVoiceNote ? 'Envoi…' : 'Vocal'}</span>
                  </button>

                  {/* Take / Attach Photo */}
                  <button
                    type="button"
                    disabled={isUploadingObsPhoto}
                    onClick={() => openCameraForField(field.key)}
                    className="px-2 py-1 text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Prendre ou joindre une photo pour cette observation"
                  >
                    {isUploadingObsPhoto ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{isUploadingObsPhoto ? 'Envoi…' : 'Photo'}</span>
                  </button>
                </div>
              </div>

              {/* Active Recording Banner for this field */}
              {isRecordingThisField && (
                <div className="mb-2.5 p-2 bg-rose-900 text-white rounded-lg border border-rose-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping"></span>
                    <span className="font-mono font-bold">{formatTimer(recordingSeconds)}</span>
                    <span className="text-rose-200 text-[11px]">Enregistrement vocal pour ce champ...</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={stopFieldRecording}
                      className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={cancelFieldRecording}
                      className="px-2 py-0.5 bg-rose-800 text-white text-[10px] rounded cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={fieldValue}
                  onChange={(e) => handleTextChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={isSubmitted}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-y shadow-2xs disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Attachments Section for THIS specific field */}
              {(fieldVoiceNotes.length > 0 || fieldPhotos.length > 0) && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-2">
                  {/* Field Voice Notes List */}
                  {fieldVoiceNotes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fieldVoiceNotes.map((note) => {
                        const isPlaying = playingAudioId === note.id;
                        return (
                          <div
                            key={note.id}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                              isPlaying
                                ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => playAudioNote(note)}
                              className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-90"
                            >
                              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 ml-0.5 fill-current" />}
                            </button>
                            <span className="text-[11px] font-semibold">Note Vocale ({formatTimer(note.durationSeconds)})</span>
                            <span className="text-[9px] text-slate-400 font-mono">{note.date}</span>
                            <button
                              type="button"
                              onClick={() => deleteAudioNote(note.id)}
                              className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Field Photos Thumbnails Grid */}
                  {fieldPhotos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {fieldPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-300 bg-slate-900 shrink-0"
                        >
                          <img
                            src={photo.dataUrl}
                            alt="Preuve"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoModal(photo)}
                              className="p-1 bg-white/80 rounded hover:bg-white text-slate-900 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePhoto(photo.id)}
                              className="p-1 bg-rose-600 rounded text-white cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Full Screen Photo View */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Photo de Confirmation ({selectedPhotoModal.date})
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2 bg-black flex items-center justify-center">
              <img
                src={selectedPhotoModal.dataUrl}
                alt="Confirmation"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="p-3 bg-slate-950 text-slate-200 text-xs border-t border-slate-800">
              <input
                type="text"
                value={selectedPhotoModal.caption || ''}
                onChange={(e) => updatePhotoCaption(selectedPhotoModal.id, e.target.value)}
                placeholder="Ajouter une légende explicative..."
                className="w-full px-3 py-1.5 bg-slate-800 text-white rounded border border-slate-700 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Live Camera Capture */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4">
          <div className="w-full max-w-md flex items-center justify-between text-white py-2">
            <span className="text-sm font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              Prise de Vue Caméra
            </span>
            <button
              type="button"
              onClick={closeCameraStream}
              className="p-2 text-slate-300 hover:text-white rounded-full bg-slate-800/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full max-w-md aspect-3/4 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center my-auto">
            <video
              ref={videoElementRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-full max-w-md pb-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={captureCameraSnapshot}
              className="w-16 h-16 rounded-full bg-white border-4 border-blue-500 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title="Capturer"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
