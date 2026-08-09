import {
  ArrowRight,
  BriefcaseBusiness,
  FilePenLine,
  Globe2,
  HeartHandshake,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import {
  createJobOpeningAction,
  setJobStatusAction,
} from "@/modules/public-content/public-content-actions";
import { getCareersPageData } from "@/modules/public-content/public-content-queries";

const values = [
  [
    Lightbulb,
    "Build what should exist",
    "Challenge procurement conventions and solve difficult problems with clarity.",
  ],
  [
    Users,
    "Work across disciplines",
    "Product, procurement, engineering, design and operations build together.",
  ],
  [
    Globe2,
    "Think globally",
    "Design for different countries, languages, currencies and operating realities.",
  ],
  [
    HeartHandshake,
    "Earn trust",
    "Protect customer data, explain decisions and keep commitments.",
  ],
];

export default async function Page() {
  const data = await getCareersPageData();

  return (
    <main>
      <PageHero
        eyebrow="Careers"
        title="Build the intelligence layer for global commerce."
        description="Join a multidisciplinary team creating the next generation of procurement technology, AI agents and managed services."
        primaryLabel="View open roles"
        primaryHref="#open-roles"
        secondaryLabel="About Enorsis"
        secondaryHref="/about"
        points={[
          "Remote-aware culture",
          "Global mission",
          "High-ownership teams",
        ]}
      />

      <Section
        eyebrow="Working at Enorsis"
        title="Ambitious problems. Practical impact. Responsible innovation."
        description="We are building for procurement teams, suppliers and organizations that need better access to markets, intelligence and operational capability."
      >
        <div className="principle-grid">
          {values.map(
            ([Icon, title, copy]) => {
              const I =
                Icon as typeof Lightbulb;
              return (
                <article
                  key={title as string}
                >
                  <span>
                    <I size={23} />
                  </span>
                  <h3>
                    {title as string}
                  </h3>
                  <p>
                    {copy as string}
                  </p>
                </article>
              );
            },
          )}
        </div>
      </Section>

      {data.canPublish ? (
        <Section
          tone="soft"
          eyebrow="Super-admin career publisher"
          title="Publish Enorsis job openings."
          description="Only PLATFORM_SUPER_ADMIN users can create, publish or withdraw openings."
        >
          <form
            action={createJobOpeningAction}
            className="publisher-form"
          >
            <label className="publisher-span-2">
              Role title
              <input
                required
                name="title"
                className="public-form-control"
              />
            </label>
            <label>
              Department
              <input
                required
                name="department"
                className="public-form-control"
                placeholder="Engineering"
              />
            </label>
            <label>
              Location
              <input
                required
                name="location"
                className="public-form-control"
                placeholder="United States / Remote"
              />
            </label>
            <label>
              Employment type
              <select
                required
                name="employmentType"
                className="public-form-control public-select"
                defaultValue="Full-time"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
                <option>Temporary</option>
              </select>
            </label>
            <label>
              Work arrangement
              <select
                name="workArrangement"
                className="public-form-control public-select"
                defaultValue="Remote"
              >
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
                <option>Flexible</option>
              </select>
            </label>
            <label>
              Apply email
              <input
                name="applyEmail"
                type="email"
                className="public-form-control"
                placeholder="careers@enorsis.org"
              />
            </label>
            <label>
              External apply URL
              <input
                name="applyUrl"
                type="url"
                className="public-form-control"
                placeholder="https://..."
              />
            </label>
            <label>
              Closing date
              <input
                name="closesAt"
                type="date"
                className="public-form-control"
              />
            </label>
            <label className="publisher-span-2">
              Short summary
              <textarea
                required
                name="summary"
                className="public-form-control publisher-textarea"
              />
            </label>
            <label className="publisher-span-2">
              Full role description
              <textarea
                required
                name="description"
                className="public-form-control publisher-textarea publisher-body"
              />
            </label>
            <div className="publisher-actions publisher-span-2">
              <button
                name="publish"
                value="false"
                className="button-secondary"
              >
                Save draft
              </button>
              <button
                name="publish"
                value="true"
                className="button-primary"
              >
                Publish opening
              </button>
            </div>
          </form>
        </Section>
      ) : null}

      <section id="open-roles">
        <Section
          tone="soft"
          eyebrow="Open opportunities"
          title="Help create the future of procurement."
        >
          {data.jobs.length === 0 ? (
            <div className="empty-careers">
              <div>
                <p>
                  Current openings
                </p>
                <h3>
                  No roles are published yet.
                </h3>
                <span>
                  New opportunities will
                  appear here as the Enorsis
                  team grows.
                </span>
              </div>
              <a
                href="mailto:careers@enorsis.org?subject=Enorsis%20talent%20network"
                className="button-secondary"
              >
                Join our talent network
                <ArrowRight size={17} />
              </a>
            </div>
          ) : (
            <div className="career-opening-grid">
              {data.jobs.map((job) => {
                const applyHref =
                  job.applyUrl ||
                  `mailto:${
                    job.applyEmail ||
                    "careers@enorsis.org"
                  }?subject=${encodeURIComponent(
                    `Application: ${job.title}`,
                  )}`;

                return (
                  <article
                    key={job.id}
                    className="career-opening-card"
                  >
                    <div className="career-opening-meta">
                      <span>
                        <BriefcaseBusiness
                          size={14}
                        />
                        {job.department}
                      </span>
                      <span>
                        <MapPin size={14} />
                        {job.location}
                      </span>
                    </div>

                    <h2>{job.title}</h2>
                    <p>{job.summary}</p>

                    <div className="career-tag-row">
                      <span>
                        {job.employmentType}
                      </span>
                      {job.workArrangement ? (
                        <span>
                          {
                            job.workArrangement
                          }
                        </span>
                      ) : null}
                    </div>

                    <div className="managed-content-footer">
                      <a
                        href={applyHref}
                        target={
                          job.applyUrl
                            ? "_blank"
                            : undefined
                        }
                        rel={
                          job.applyUrl
                            ? "noreferrer"
                            : undefined
                        }
                        className="button-primary"
                      >
                        Apply now
                        <ArrowRight size={15} />
                      </a>

                      {data.canPublish ? (
                        <form
                          action={
                            setJobStatusAction
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={job.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              job.status ===
                              "PUBLISHED"
                                ? "DRAFT"
                                : "PUBLISHED"
                            }
                          />
                          <button className="publisher-mini-button">
                            <FilePenLine
                              size={13}
                            />
                            {job.status ===
                            "PUBLISHED"
                              ? "Withdraw"
                              : "Publish"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {data.canPublish ? (
            <div className="publisher-access-note">
              <ShieldCheck size={16} />
              Career publishing authority: PLATFORM_SUPER_ADMIN only.
            </div>
          ) : null}
        </Section>
      </section>
    </main>
  );
}
