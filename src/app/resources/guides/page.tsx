import {
  ArrowDownToLine,
  BookOpen,
  FilePenLine,
  ShieldCheck,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import {
  createGuideAction,
  setGuideStatusAction,
} from "@/modules/public-content/public-content-actions";
import { getGuidesPageData } from "@/modules/public-content/public-content-queries";

const starterGuides = [
  {
    title:
      "The AI Procurement Transformation Playbook",
    summary:
      "A practical framework for selecting use cases, establishing governance and scaling responsible procurement AI.",
    resourceType: "Executive guide",
    pageCount: 18,
  },
  {
    title:
      "Global Supplier Risk Management Guide",
    summary:
      "Build a continuous supplier-risk program spanning financial, operational, regulatory and geopolitical exposure.",
    resourceType: "Strategy guide",
    pageCount: 24,
  },
];

export default async function Page() {
  const data = await getGuidesPageData();

  const visible =
    data.guides.length > 0
      ? data.guides
      : starterGuides.map(
          (guide, index) => ({
            id: `starter-${index}`,
            ...guide,
            fileUrl: "#",
            fileName: "",
            status: "PUBLISHED",
            featured: index === 0,
          }),
        );

  return (
    <main>
      <PageHero
        eyebrow="Guides & eBooks"
        title="Practical resources for modern procurement leaders."
        description="Download implementation playbooks, operating-model guides and executive briefs created to help teams move from procurement administration to procurement intelligence."
        primaryLabel="Browse guides"
        primaryHref="#guide-library"
        points={[
          "Actionable frameworks",
          "Executive-ready insights",
          "Free downloadable resources",
        ]}
      />

      {data.canPublish ? (
        <Section
          tone="soft"
          eyebrow="Super-admin resource publisher"
          title="Upload and publish Enorsis guides and eBooks."
          description="PDF and EPUB resources are uploaded through the existing Vercel Blob integration. Publishing is restricted to PLATFORM_SUPER_ADMIN."
        >
          <form
            action={createGuideAction}
            className="publisher-form"
          >
            <label className="publisher-span-2">
              Resource title
              <input
                required
                name="title"
                className="public-form-control"
              />
            </label>
            <label>
              Resource type
              <input
                name="resourceType"
                className="public-form-control"
                placeholder="Executive guide"
              />
            </label>
            <label>
              Page count
              <input
                name="pageCount"
                type="number"
                min="1"
                className="public-form-control"
              />
            </label>
            <label className="publisher-span-2">
              Summary
              <textarea
                required
                name="summary"
                className="public-form-control publisher-textarea"
              />
            </label>
            <label className="publisher-span-2">
              PDF or EPUB file
              <input
                required
                name="file"
                type="file"
                accept=".pdf,.epub,application/pdf,application/epub+zip"
                className="public-form-control"
              />
            </label>
            <label className="form-checkbox-row">
              <input
                type="checkbox"
                name="featured"
              />
              Featured resource
            </label>
            <div className="publisher-actions">
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
                Upload & publish
              </button>
            </div>
          </form>
        </Section>
      ) : null}

      <section id="guide-library">
        <Section
          eyebrow="Resource library"
          title="Guidance you can apply—not generic thought leadership."
          description="Each resource is designed around a concrete procurement decision, transformation challenge or operating model."
        >
          <div className="resource-responsive-grid">
            {visible.map((guide, index) => (
              <article
                className="managed-guide-card"
                key={guide.id}
              >
                <div className="managed-guide-cover">
                  <BookOpen size={28} />
                  <span>
                    ENORSIS / 0{index + 1}
                  </span>
                  <strong>
                    {guide.resourceType}
                  </strong>
                </div>

                <div className="managed-guide-copy">
                  <div className="resource-meta">
                    <span>
                      {guide.resourceType}
                    </span>
                    <span>
                      {guide.pageCount
                        ? `${guide.pageCount} pages`
                        : "Digital resource"}
                    </span>
                  </div>

                  <h2>{guide.title}</h2>
                  <p>{guide.summary}</p>

                  <div className="managed-content-footer">
                    {guide.fileUrl !== "#" ? (
                      <a
                        href={guide.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="download-resource-button"
                      >
                        <ArrowDownToLine size={16} />
                        Download
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        Preview resource
                      </span>
                    )}

                    {"createdByUserId" in
                      guide &&
                    data.canPublish ? (
                      <form
                        action={
                          setGuideStatusAction
                        }
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={guide.id}
                        />
                        <input
                          type="hidden"
                          name="status"
                          value={
                            guide.status ===
                            "PUBLISHED"
                              ? "DRAFT"
                              : "PUBLISHED"
                          }
                        />
                        <button className="publisher-mini-button">
                          <FilePenLine size={13} />
                          {guide.status ===
                          "PUBLISHED"
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {data.canPublish ? (
            <div className="publisher-access-note">
              <ShieldCheck size={16} />
              Resource upload authority: PLATFORM_SUPER_ADMIN only.
            </div>
          ) : null}
        </Section>
      </section>
    </main>
  );
}
