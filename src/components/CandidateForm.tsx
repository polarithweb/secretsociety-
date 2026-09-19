import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  FileText,
  Send,
  User,
  Fingerprint
} from 'lucide-react';
import { Question, SocietySettings, Answersheet, CandidateAnswer } from '../types';
import { submitAnswersheet } from '../lib/firebase';
import { PhotoUploader } from './PhotoUploader';

interface CandidateFormProps {
  settings: SocietySettings;
  questions: Question[];
}

export const CandidateForm: React.FC<CandidateFormProps> = ({
  settings,
  questions
}) => {
  // Candidate identity details
  const [candidateName, setCandidateName] = useState('');
  const [candidateAlias, setCandidateAlias] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');

  // Answers keyed by questionId
  const [answers, setAnswers] = useState<Record<string, any>>({});
  // Candidate photo uploads
  const [photos, setPhotos] = useState<string[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedAnswersheet, setSubmittedAnswersheet] = useState<Answersheet | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Track start time for recording duration
  const startTimeRef = useRef<number>(Date.now());

  // Filter questions targeted for candidates (not exclusive to members)
  const candidateQuestions = questions.filter(
    (q) => !q.target || q.target === 'candidate' || q.target === 'both'
  );

  // Handler for candidate answering questions
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
    setValidationError(null);
  };

  // Validate form requirements
  const validateForm = () => {
    if (!candidateName.trim()) {
      return 'Please enter your full name.';
    }
    if (!candidateAlias.trim()) {
      return 'Please choose a candidate alias / moniker.';
    }
    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      return 'Please enter a valid email address.';
    }

    // Check mandatory questions
    for (const q of candidateQuestions) {
      if (q.required) {
        if (q.type === 'agree_disagree') {
          if (answers[q.id] === undefined || answers[q.id] === null) {
            return `Question "${q.title}" requires your agreement or dissent.`;
          }
        } else if (q.type === 'multiple_choice') {
          if (answers[q.id] === undefined || answers[q.id] === null) {
            return `Question "${q.title}" requires an option selection.`;
          }
        } else if (q.type === 'text') {
          if (!answers[q.id] || answers[q.id].trim().length < 1) {
            return `Question "${q.title}" requires a text response.`;
          }
        } else if (q.type === 'scale') {
          if (answers[q.id] === undefined) {
            return `Question "${q.title}" requires a rating selection.`;
          }
        } else if (q.type === 'photo') {
          if (!answers[q.id] || answers[q.id].length === 0) {
            return `Question "${q.title}" requires an uploaded image.`;
          }
        }
      }
    }

    return null;
  };

  // Submit form - no answer checking, raw answers sent to council
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const err = validateForm();
    if (err) {
      setValidationError(err);
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const evaluatedAnswers: Record<string, CandidateAnswer> = {};
      candidateQuestions.forEach((q) => {
        const userAnswer = answers[q.id];
        evaluatedAnswers[q.id] = {
          questionId: q.id,
          questionTitle: q.title,
          questionType: q.type,
          answer: userAnswer !== undefined ? userAnswer : null
        };
      });

      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

      const answersheetPayload: Omit<Answersheet, 'id'> = {
        candidateName: candidateName.trim(),
        candidateAlias: candidateAlias.trim(),
        candidateEmail: candidateEmail.trim(),
        submittedAt: new Date().toISOString(),
        timeSpentSeconds,
        score: 0,
        maxScore: 0,
        percentage: 0,
        passed: false,
        answers: evaluatedAnswers,
        photos,
        status: 'pending'
      };

      const docId = await submitAnswersheet(answersheetPayload);

      const finalized: Answersheet = {
        ...answersheetPayload,
        id: docId
      };

      setSubmittedAnswersheet(finalized);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitErr) {
      console.error('Submission error:', submitErr);
      setValidationError('Failed to submit application. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Post-Submission Screen
  if (submittedAnswersheet) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-white overflow-x-hidden">
        <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-10 shadow-2xl text-center">
          {settings.sigilImage && (
            <div className="flex justify-center mb-6">
              <div className="p-2.5 rounded-xl border border-white/20 bg-black max-w-[120px] max-h-[120px] flex items-center justify-center shadow-lg">
                <img
                  src={settings.sigilImage}
                  alt="Society Sigil"
                  className="max-h-24 max-w-24 object-contain"
                />
              </div>
            </div>
          )}

          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/70 font-medium mb-2">
            Application Transmitted
          </div>

          <h1 className="font-chancery text-3xl sm:text-4xl font-bold tracking-wide text-white mb-3">
            {settings.heading || 'secretsociety_ind'}
          </h1>

          <p className="font-editorial italic text-base sm:text-lg text-white/90 max-w-md mx-auto mb-8 leading-relaxed">
            {settings.closingMessage ||
              'Your responses have been recorded and transmitted directly to the Council. Your dossier is under sealed review.'}
          </p>

          {/* Submission Details Summary */}
          <div className="bg-black border border-white/20 rounded-lg p-5 mb-8 text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-white/60">Reference ID:</span>
              <span className="font-mono text-white select-all font-medium">{submittedAnswersheet.id}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-white/60">Candidate Alias:</span>
              <span className="font-mono text-white font-medium">{submittedAnswersheet.candidateAlias}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-white/60">Full Name:</span>
              <span className="font-body text-white">{submittedAnswersheet.candidateName}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-white/60">Contact Email:</span>
              <span className="font-mono text-white">{submittedAnswersheet.candidateEmail}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-white/60">Questions Answered:</span>
              <span className="font-mono text-white font-medium">{Object.keys(submittedAnswersheet.answers || {}).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-white/60">Status:</span>
              <span className="font-mono text-white font-semibold uppercase tracking-wider">
                Under Council Review
              </span>
            </div>
          </div>

          {submittedAnswersheet.photos.length > 0 && (
            <div className="mb-8 text-left">
              <div className="font-mono text-[11px] uppercase tracking-wider text-white/80 font-medium mb-3">
                Uploaded Verification Photographs ({submittedAnswersheet.photos.length})
              </div>
              <div className="flex items-center gap-3">
                {submittedAnswersheet.photos.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Verification ${i + 1}`}
                    className="w-16 h-16 rounded-md object-cover border border-white/20"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-display px-8 py-2.5 rounded-lg border border-white/30 bg-black hover:bg-white/10 text-white text-xs uppercase tracking-widest transition-all font-semibold"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Application Form
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 text-white overflow-x-hidden">
      {/* Header */}
      <div className="text-center pb-8 border-b border-white/20 mb-8">
        {settings.sigilImage && (
          <div className="flex justify-center mb-5 pt-1">
            <div className="p-2.5 rounded-xl border border-white/20 bg-black max-w-[120px] max-h-[120px] flex items-center justify-center shadow-lg">
              <img
                src={settings.sigilImage}
                alt="Society Sigil"
                className="max-h-24 max-w-24 object-contain"
              />
            </div>
          </div>
        )}

        <div>
          <h1 className="font-chancery text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide text-white">
            {settings.heading || 'secretsociety_ind'}
          </h1>
          <p className="font-mono text-xs sm:text-sm tracking-[0.25em] uppercase text-white/70 font-medium mt-2">
            {settings.subheading || 'Candidate Application Portal'}
          </p>
        </div>
      </div>

      {settings.oathIntro && (
        <div className="mb-8 p-5 rounded-lg bg-black border border-white/20 text-white/90 font-editorial italic text-base sm:text-lg leading-relaxed shadow-sm">
          "{settings.oathIntro}"
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="mb-6 flex items-center gap-3 p-3.5 rounded-lg bg-black border border-white/50 text-white font-mono text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Candidate Profile */}
        <div className="bg-black border border-white/20 rounded-xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 font-chancery text-base sm:text-lg font-semibold text-white tracking-wide">
            <User className="w-4 h-4 text-white" />
            Candidate Credentials
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] font-medium text-white/80 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-white">*</span>
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Johnathan Vance"
                className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] font-medium text-white/80 uppercase tracking-wider mb-1.5">
                Candidate Alias / Moniker <span className="text-white">*</span>
              </label>
              <input
                type="text"
                value={candidateAlias}
                onChange={(e) => setCandidateAlias(e.target.value)}
                placeholder="e.g. Initiate-42"
                className="w-full font-mono px-3.5 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] font-medium text-white/80 uppercase tracking-wider mb-1.5">
                Contact Email <span className="text-white">*</span>
              </label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="candidate@domain.com"
                className="w-full font-mono px-3.5 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Questions (Set from Admin Portal) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-chancery text-base sm:text-lg font-semibold text-white tracking-wide">
              <Fingerprint className="w-4 h-4 text-white" />
              Examination Questions <span className="font-mono text-xs text-white/60 font-normal">({questions.length})</span>
            </div>
          </div>

          {candidateQuestions.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-black border border-white/30 flex items-center justify-center text-white">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-chancery text-lg font-semibold text-white tracking-wide">No Questions Configured</h3>
              <p className="font-editorial italic text-sm sm:text-base text-white/70 max-w-md mx-auto leading-relaxed">
                Questions will be populated by the council. Please check back shortly.
              </p>
            </div>
          ) : (
            candidateQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-black border border-white/20 rounded-xl p-6 space-y-4 hover:border-white/40 transition-colors"
              >
                {/* Question title and metadata */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm text-white/50 font-bold tracking-wider">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <h3 className="font-body text-base font-medium text-white leading-snug">
                        {q.title}
                      </h3>
                    </div>
                    {q.description && (
                      <p className="font-editorial italic text-sm text-white/80 pl-6 leading-relaxed">
                        {q.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {q.category && (
                      <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white">
                        {q.category}
                      </span>
                    )}
                    {q.required && (
                      <span className="font-mono text-[10px] tracking-wider uppercase text-white/80 font-medium">
                        Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Inputs according to Type */}
                <div className="pl-0 sm:pl-6 pt-2">
                  {/* Agree / Disagree */}
                  {q.type === 'agree_disagree' && (
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, true)}
                        className={`font-mono px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all border ${
                          answers[q.id] === true
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-black text-white/80 border-white/20 hover:border-white/50'
                        }`}
                      >
                        Agree
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, false)}
                        className={`font-mono px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all border ${
                          answers[q.id] === false
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-black text-white/80 border-white/20 hover:border-white/50'
                        }`}
                      >
                        Disagree
                      </button>
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2.5">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = answers[q.id] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleAnswerChange(q.id, optIdx)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white text-black border-white font-medium'
                                : 'bg-black border-white/20 text-white/80 hover:border-white/50'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-black bg-black text-white'
                                  : 'border-white/40 bg-black'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-mono text-xs text-white/40 uppercase mr-1">
                              [{String.fromCharCode(65 + optIdx)}]
                            </span>
                            <span className="font-body text-xs sm:text-sm">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 1-10 Scale */}
                  {q.type === 'scale' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, val)}
                            className={`font-mono w-9 h-9 rounded-lg text-xs transition-all border font-semibold ${
                              answers[q.id] === val
                                ? 'bg-white text-black border-white font-bold'
                                : 'bg-black text-white/80 border-white/20 hover:border-white/50'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-white/60 pt-1 tracking-wider uppercase">
                        <span>1 (Lowest)</span>
                        <span>10 (Highest)</span>
                      </div>
                    </div>
                  )}

                  {/* Text Essay / Short Response */}
                  {q.type === 'text' && (
                    <textarea
                      rows={3}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Type your response..."
                      className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                    />
                  )}

                  {/* Question Photo Upload */}
                  {q.type === 'photo' && (
                    <PhotoUploader
                      photos={answers[q.id] || []}
                      onChange={(newPhotos) => handleAnswerChange(q.id, newPhotos)}
                      maxPhotos={2}
                      label="Attach Required Photo"
                      description="Upload visual proof or document required for this question."
                      required={q.required}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Section 3: General Photographic Verification */}
        <div className="bg-black border border-white/20 rounded-xl p-6 sm:p-7 space-y-4">
          <PhotoUploader
            photos={photos}
            onChange={setPhotos}
            maxPhotos={3}
            label="Candidate Photographic Identification"
            description="Upload candidate portrait or identity confirmation."
            required={false}
          />
        </div>

        {/* Submit Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-mono text-xs text-white/70">
            {candidateQuestions.length > 0 ? `${candidateQuestions.length} Questions on this Application` : ''}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Transmitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Application</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

