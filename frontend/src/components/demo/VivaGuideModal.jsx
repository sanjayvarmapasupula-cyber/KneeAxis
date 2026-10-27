import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  Sparkles,
  HelpCircle,
  Clock,
  Play,
  CheckCircle2,
  ChevronRight,
  Brain,
  Layers,
  Scissors,
  ShieldCheck,
  Award,
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
} from 'lucide-react';

export default function VivaGuideModal() {
  const [open, setOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  const demoSteps = [
    {
      step: 1,
      screen: 'Dashboard & Patient Registry',
      route: '/dashboard',
      duration: '45 seconds',
      action: 'Introduce Clinical Atlas and select Eleanor Vance (MRN-ROSA-0568).',
      talkingPoints: [
        'Commercial surgical robots (like Zimmer Biomet ROSA) are closed-loop black boxes that obscure mathematical resection planning and 3D modeling.',
        'Clinical Atlas provides an end-to-end, auditable pipeline spanning multimodal AI triage, 3D bone segmentation, coordinate-preserving mesh reconstruction, and deterministic robotic resection calculation.',
        'Show Eleanor Vance: 64-year-old female presenting with severe medial compartment right knee pain and constitutional varus alignment.',
      ],
      proTip: 'Emphasize that the system implements the landmark clinical trial protocol published by Eijking et al. (2025) in Trials journal (NCT05685693).',
    },
    {
      step: 2,
      screen: 'Imaging Viewer & ResNet-50 KL Grading',
      route: '/imaging',
      duration: '60 seconds',
      action: 'Toggle Grad-CAM overlay and thermal synovitis heatmap on the AP radiograph.',
      talkingPoints: [
        'Our Tier 1 model is a 50-layer Deep Residual CNN (ResNet-50) trained on Kellgren-Lawrence severity grading (KL 0 to 4).',
        'Model achieves Mean Multiclass AUC of 0.8703, with 0.9936 AUC for severe KL-4 and 0.9482 AUC for moderate KL-3.',
        'Grad-CAM heatmaps highlight subchondral sclerosis and marginal osteophytes at layer4.2.conv3, proving clinical explainability.',
        'Thermal differential ΔT = 1.8°C confirms active inflammatory flare (synovitis threshold ΔT ≥ 1.5°C). Patient is flagged as a high-priority surgical candidate.',
      ],
      proTip: 'Point out the exact formula on screen: L_Grad-CAM = ReLU(Σ α_k A^k). Professors love explainability math!',
    },
    {
      step: 3,
      screen: 'Segmentation & Attention U-Net',
      route: '/segmentation',
      duration: '75 seconds',
      action: 'Run segmentation or inspect the multi-bone slice overlays and Attention Gate maps.',
      talkingPoints: [
        'Tier 2 uses a 4-level Attention U-Net with 31.38 Million parameters for 4-class bone segmentation (Femur, Tibia, Patella, Background).',
        'Achieves 0.9944 Mean Dice and 0.9889 Mean IoU across all knee bones (Femur Dice: 0.9937, Tibia: 0.9938, Patella: 0.9958).',
        'Spatial Attention Gates dynamically compute attention coefficients α_i,j, using coarser decoder gating signals g to suppress muscle shadows and soft-tissue artifacts before skip concatenation.',
      ],
      proTip: 'Explain why vanilla U-Net fails: soft-tissue contrast around knee synovium creates false positive bone boundaries. Attention gates eliminate this.',
    },
    {
      step: 4,
      screen: '3D Reconstruction & Taubin Smoothing',
      route: '/reconstruction',
      duration: '45 seconds',
      action: 'Show 3D interactive femur and tibia meshes and inspect mesh_qa.json sidecar.',
      talkingPoints: [
        'Segmented contours are mapped directly to physical DICOM LPS (Left-Posterior-Superior) millimetric coordinates.',
        'Standard Laplacian smoothing causes bone shrinkage and distortion. We apply non-shrinking Taubin smoothing (λ=0.50, μ=-0.53, N=20).',
        'Automated geometric QA verifies volume drift < 0.35%, watertightness, 0 non-manifold edges, and Euler characteristic χ = 2.',
      ],
      proTip: 'Mention that 1 mm of bone mesh error can lead to a 2° resection misalignment in the operating room.',
    },
    {
      step: 5,
      screen: '8-Step Inverse Kinematic (iKA) Planning',
      route: '/planning',
      duration: '90 seconds',
      action: 'Walk through Steps 1 to 8, show the resection planes on the 3D knee model and gap balancing sliders.',
      talkingPoints: [
        'Conventional Mechanical Alignment (MA) cuts all bones at 90°, destroying native anatomy and requiring aggressive collateral ligament releases in 40% of cases.',
        'Inverse Kinematic Alignment (iKA) restores the patient’s pre-arthritic constitutional joint line obliquity within strict safety envelopes (mLDFA 87°-93°, mMPTA 85°-90°, aHKA ±3°).',
        'Step 5 calculates optimal femoral rotation using the dynamic MCL sweet-spot formula S = C_max + 1° to balance flexion and extension gaps without ligament release.',
        'Step 7 verifies dynamic MCL strain across 0° to 120° flexion, ensuring ε_MCL ≤ 3.0% (physiologic limit).',
      ],
      proTip: 'Point to the post-op projected alignment: constitutional varus restored to -2.0° aHKA with zero ligament trauma.',
    },
    {
      step: 6,
      screen: 'Cryptographic Audit Ledger & Hard Export Gate',
      route: '/reports',
      duration: '45 seconds',
      action: 'Trigger Surgeon Sign-Off and show the generated SHA-256 cryptographic seal.',
      talkingPoints: [
        'To prevent untested AI hallucinated meshes or corrupted cut plans from ever reaching robotic arms, we enforce a cryptographic Hard Export Gate.',
        'The export seal R is computed as SHA256(H_img || H_mesh || SurgeonID || Timestamp || Nonce).',
        'Unverified STL meshes or surgical dossiers are mathematically locked at the API layer with HTTP 403 Forbidden until full geometric and surgeon verification is recorded.',
      ],
      proTip: 'This addresses the FDA/EU-MDR regulatory requirement for AI-assisted surgical robotics traceability.',
    },
  ];

  const vivaQuestions = [
    {
      q: 'Why did you use ResNet-50 for KL Grading instead of a Vision Transformer (ViT) or standard CNN?',
      a: 'ResNet-50 was selected because deep residual connections (skip layers) solve the vanishing gradient problem in deep medical networks while maintaining a compact parameter footprint (25.5M parameters) that converges stably on moderate-sized radiographic datasets. Vision Transformers typically require tens of thousands of pre-training images to surpass CNNs on local inductive bias tasks like joint space narrowing. Furthermore, ResNet-50 integrates seamlessly with Grad-CAM at layer4.2.conv3 for localized clinical explainability.',
    },
    {
      q: 'How does the Attention Gate in Attention U-Net mathematically work, and why is it superior to vanilla U-Net?',
      a: 'In standard U-Net, high-resolution skip connections transfer both salient bone features and irrelevant soft-tissue noise (synovium, muscle, fat). Attention U-Net places an Additive Attention Gate (AG) at each skip connection. The AG takes the feature map x from the encoder and the gating signal g from the coarser decoder level, passes them through linear transformations (W_x, W_g), sums them, applies ReLU, passes through a 1x1 convolution ψ, and applies a Sigmoid activation to produce attention coefficients α ∈ [0, 1]. Multiplying x by α dynamically scales down background noise while preserving sharp cortical bone boundaries, yielding our 0.9944 Mean Dice score.',
    },
    {
      q: 'What is the fundamental clinical difference between Mechanical Alignment (MA) and Inverse Kinematic Alignment (iKA)?',
      a: 'Mechanical Alignment (MA) aims to align the hip-knee-ankle (aHKA) axis to a rigid 0° neutral angle and cut the distal femur and proximal tibia perpendicular (90°) to their mechanical axes. However, only 15% of the natural population has a neutral 0° alignment—most have constitutional varus (2-4°). MA forces unnatural tension on the Medial Collateral Ligament (MCL), requiring surgical ligament release. Inverse Kinematic Alignment (iKA) restores the patient’s natural constitutional obliquity while strictly maintaining MCL isometric tension (strain ≤ 3%) and equalizing flexion/extension gaps without ligament transection.',
    },
    {
      q: 'Why did you choose Taubin smoothing over standard Laplacian mesh smoothing for the 3D bone models?',
      a: 'Standard Laplacian smoothing moves each vertex toward the centroid of its neighbors, which causes severe volume shrinkage and rounds off critical anatomical landmarks (e.g., femoral condyle peaks and tibial plateau borders). Taubin smoothing utilizes a two-step alternating filter: a positive step (λ = 0.50) that smooths high-frequency noise, followed immediately by a negative inflation step (μ = -0.53, where |μ| > λ) that restores the original volume. This guarantees a volume drift of < 0.35%, preventing catastrophic millimeter-level surgical resection errors.',
    },
    {
      q: 'How does your Hard Export Gate ensure patient safety and regulatory compliance (FDA/EU-MDR)?',
      a: 'Medical AI systems cannot operate as uncontrolled black boxes. Our Tier 5 Hard Export Gate prevents any 3D STL mesh or robotic resection plan from being exported to the physical surgical robot until two conditions are met: (1) Automated geometric QA passes (watertightness, volume drift < 0.35%, Euler characteristic χ=2), and (2) The certified orthopedic surgeon provides a digital sign-off. The system then binds the image hash (H_img), mesh hash (H_mesh), surgeon ID, timestamp, and cryptographic nonce into an immutable SHA-256 seal.',
    },
    {
      q: 'How are the resection gaps calculated in Step 4 and Step 5 of the iKA protocol?',
      a: 'In Step 4 (Extension), medial and lateral gaps are calculated by subtracting distal resections from native cartilage and bone thickness: G_ext(med) = T_cart_med + T_bone_med - D_distal_med. In Step 5 (Flexion), femoral rotation angle φ_fem is mathematically solved to minimize the difference between medial flexion and extension gaps: φ_fem* = argmin |G_flex(med) - G_ext(med)|. If the resulting rotation exceeds the constitutional sweet spot S = C_max + 1°, the system clamps the rotation to prevent coll  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-cyan-500/30 bg-[#0c1527] text-cyan-300 hover:bg-[#13223f] hover:text-cyan-200 font-semibold gap-2 shadow-xs transition-all text-xs"
        >
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span>System Defense & Clinical Manual</span>
          <Badge className="bg-cyan-600/30 border border-cyan-500/40 text-cyan-200 text-[10px] px-1.5 py-0 h-4">Active</Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-slate-800 bg-[#0c1527] text-slate-100">
        <div className="p-6 bg-gradient-to-br from-[#070b14] via-[#0c1527] to-[#091224] text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Clinical Atlas — System Architecture & Defense Manual
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full clinical verification cues, screen-by-screen architectural walkthrough, and algorithmic defense.
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">Clinical System Live</Badge>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Tabs defaultValue="screen_walkthrough" className="w-full">
            <TabsList className="bg-[#080e1b] p-1 border border-slate-800 w-full grid grid-cols-3">
              <TabsTrigger value="screen_walkthrough" className="gap-2 text-xs data-[state=active]:bg-[#0f1c34] data-[state=active]:text-cyan-300">
                <Play className="w-3.5 h-3.5" />
                <span>Workflow Walkthrough</span>
              </TabsTrigger>
              <TabsTrigger value="viva_qa" className="gap-2 text-xs data-[state=active]:bg-[#0f1c34] data-[state=active]:text-cyan-300">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Algorithmic Defense (Q&A)</span>
              </TabsTrigger>
              <TabsTrigger value="elevator_pitch" className="gap-2 text-xs data-[state=active]:bg-[#0f1c34] data-[state=active]:text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Summary</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SCREEN BY SCREEN WALKTHROUGH */}
            <TabsContent value="screen_walkthrough" className="space-y-4 mt-4">
              <div className="p-3 bg-[#080e1b] border border-cyan-500/20 rounded-lg text-xs text-cyan-200 flex items-center justify-between">
                <span className="font-semibold text-cyan-300">Clinical Workflow Overview: 6 Operational Tiers</span>
                <span className="text-slate-400">Click each stage for procedural criteria</span>
              </div>

              <div className="space-y-3">
                {demoSteps.map((step) => (
                  <div
                    key={step.step}
                    className="p-4 rounded-xl border border-slate-800 bg-[#09101f] hover:border-cyan-500/40 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-xs">Stage {step.step}</Badge>
                        <h4 className="font-bold text-sm text-slate-100">{step.screen}</h4>
                        <span className="text-xs font-mono text-slate-500">({step.route})</span>
                      </div>
                      <Badge variant="outline" className="text-cyan-300 border-cyan-800/40 bg-cyan-950/30 text-[11px] w-fit flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {step.duration}
                      </Badge>
                    </div>

                    <div className="text-xs space-y-2">
                      <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Play className="w-3 h-3 text-cyan-400" /> Operational Step: <span className="font-normal text-slate-300">{step.action}</span>
                      </p>

                      <div className="p-3 rounded-lg bg-[#060b14] border border-slate-800 space-y-1.5">
                        <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Clinical Criteria:</p>
                        <ul className="space-y-1 text-slate-300 list-disc list-inside">
                          {step.talkingPoints.map((point, i) => (
                            <li key={i} className="leading-relaxed">{point}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Clinical Insight:</strong> {step.proTip}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 2: TOP VIVA QUESTIONS & ANSWERS */}
            <TabsContent value="viva_qa" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Question List */}
                <div className="md:col-span-1 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Query:</p>
                  {vivaQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedQuestion(idx)}
                      className={`w-full text-left p-3 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                        selectedQuestion === idx
                          ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 font-semibold shadow-xs'
                          : 'bg-[#080e1b] hover:bg-[#0f1c34] text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span className="line-clamp-2">Q{idx + 1}: {q.q}</span>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${selectedQuestion === idx ? 'text-cyan-400' : 'text-slate-500'}`} />
                    </button>
                  ))}
                </div>

                {/* Answer Display */}
                <div className="md:col-span-2 p-5 rounded-xl border border-slate-800 bg-[#080e1b] space-y-4">
                  <div>
                    <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs mb-2">Question {selectedQuestion + 1}</Badge>
                    <h3 className="text-sm md:text-base font-bold text-slate-100">
                      {vivaQuestions[selectedQuestion].q}
                    </h3>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0c1527] border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <MessageSquareQuote className="w-4 h-4 text-cyan-400" /> Technical Model Answer:
                    </p>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                      {vivaQuestions[selectedQuestion].a}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: 60-SECOND ELEVATOR PITCH */}
            <TabsContent value="elevator_pitch" className="space-y-4 mt-4">
              <div className="p-6 rounded-2xl bg-[#080e1b] text-white border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
                    Executive Clinical Overview
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">System Specification</span>
                </div>

                <div className="space-y-3 text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
                  <p>
                    Commercial surgical robotics platforms like Zimmer Biomet’s ROSA cost over $1 million, yet operate as proprietary <strong>'black boxes'</strong> where surgeons cannot inspect or audit how AI creates 3D bone models or computes resection angles.
                  </p>
                  <p>
                    We built <strong>Clinical Atlas</strong>—an open, auditable, full-stack medical system that integrates dual deep learning models with deterministic surgical mathematics:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-cyan-200">
                    <li><strong>Tier 1 (ResNet-50)</strong> performs Kellgren-Lawrence OA severity triage with Grad-CAM saliency explainability (0.8703 Mean AUC).</li>
                    <li><strong>Tier 2 (Attention U-Net)</strong> segments patient-specific knee bones with 0.9944 Mean Dice, using spatial attention gates to eliminate soft-tissue noise.</li>
                    <li><strong>Tier 3 & 4</strong> perform non-shrinking Taubin 3D reconstruction and compute an 8-step Inverse Kinematic Arthroplasty resection plan that preserves native joint obliquity without surgical ligament release.</li>
                    <li><strong>Tier 5</strong> seals every plan with a cryptographic SHA-256 Hard Export Gate before robotic execution.</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Based on Eijking et al. (2025) Trial Protocol</span>
                  <span className="font-semibold text-emerald-400">Clinical Enterprise Ready</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
