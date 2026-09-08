import Image, { type StaticImageData } from 'next/image';

type DashboardShowcaseProps = {
  image: StaticImageData | string;
};

export default function DashboardShowcase({
  image,
}: DashboardShowcaseProps) {
  return (
    <section
      id="product"
      className="relative overflow-hidden bg-white px-6 pb-24 pt-8 font-sans sm:px-8 lg:px-10 lg:pb-32 lg:pt-12"
    >
      <div className="mx-auto w-full max-w-[1180px]">

        {/* Dashboard Preview */}
        <div className="relative mx-auto w-full max-w-[1060px]">

          {/* Soft glow behind dashboard */}
          <div
            className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[85%] -translate-x-1/2 rounded-full opacity-40 blur-[90px]"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(27, 123, 104, 0.12) 0%, rgba(27, 123, 104, 0.04) 45%, rgba(255, 255, 255, 0) 75%)',
            }}
          />

          {/* Dashboard frame */}
          <div className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.10)]">

            <Image
              src={image}
              alt="MedXverse hospital management dashboard"
              width={1600}
              height={1000}
              priority
              className="block h-auto w-full"
            />

            {/* Bottom fade */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%]"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.02) 12%, rgba(255,255,255,0.12) 28%, rgba(255,255,255,0.38) 48%, rgba(255,255,255,0.72) 68%, rgba(255,255,255,0.94) 84%, #ffffff 100%)',
              }}
            />

            {/* Extra atmospheric fade to remove any hard visual edge */}
            <div
              className="pointer-events-none absolute inset-x-[-8%] bottom-[-12%] h-[35%] blur-[22px]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 45%, rgba(255,255,255,0) 78%)',
              }}
            />
          </div>
        </div>

        {/* Section Heading */}
        <div className="relative z-10 mx-auto -mt-8 max-w-[720px] text-center sm:-mt-12">
          <h2 className="text-[30px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[38px] lg:text-[42px]">
            Everything your hospital needs,
            <br className="hidden sm:block" />
            <span className="text-[#1b7b68]">
              all in one platform.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-[600px] text-[15px] leading-7 text-slate-500 sm:text-[16px]">
            MedXverse brings your clinical, administrative and operational
            workflows together in one intelligent hospital management system.
          </p>
        </div>

        {/* Partner / Trust Row */}
        <div className="relative z-10 mt-16">
          <p className="text-center text-[13px] font-medium uppercase tracking-[0.16em] text-slate-400">
            Built for modern healthcare teams
          </p>

          <div className="mx-auto mt-8 flex max-w-[900px] flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40 sm:gap-x-16 lg:justify-between">
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-slate-700">
              Hospitals
            </span>

            <span className="text-[17px] font-semibold tracking-[-0.03em] text-slate-700">
              Clinics
            </span>

            <span className="text-[17px] font-semibold tracking-[-0.03em] text-slate-700">
              Diagnostic Centers
            </span>

            <span className="text-[17px] font-semibold tracking-[-0.03em] text-slate-700">
              Healthcare Teams
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}