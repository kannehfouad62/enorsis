import {
  ArrowRight,
  FilePenLine,
  ShieldCheck,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import {
  createPublicationAction,
  setPublicationStatusAction,
} from "@/modules/public-content/public-content-actions";
import { getPublicationsPageData } from "@/modules/public-content/public-content-queries";

const starterPosts = [
  {
    category: "Responsible AI",
    title:
      "Why autonomous procurement still needs human governance",
    summary:
      "AI agents can accelerate sourcing and analysis, but authority, evidence and accountability must remain explicit.",
    readTime: "8 min read",
  },
  {
    category: "Supplier intelligence",
    title:
      "Five signals your supplier network is more fragile than it appears",
    summary:
      "Traditional scorecards rarely capture concentration, dependency and changing external risk soon enough.",
    readTime: "6 min read",
  },
  {
    category: "Global operations",
    title:
      "Multi-currency procurement without financial chaos",
    summary:
      "A durable architecture separates transaction, functional, reporting and display currencies while preserving rate history.",
    readTime: "7 min read",
  },
];

export default async function Page() {
  const data =
    await getPublicationsPageData();

  const visible =
    data.publications.length > 0
      ? data.publications
      : starterPosts.map(
          (post, index) => ({
            id: `starter-${index}`,
            category: post.category,
            title: post.title,
            summary: post.summary,
            readTime: post.readTime,
            body: post.summary,
            featured: index === 0,
            status: "PUBLISHED",
            publishedAt: null,
          }),
        );

  return (
    <main>
      <PageHero
        eyebrow="Publications"
        title="Ideas shaping the future of procurement."
        description="Research, perspectives and product insights on AI, sourcing, supplier intelligence, global operations and Procurement-as-a-Service."
        primaryLabel="Read latest insights"
        primaryHref="#latest"
        points={[
          "Original perspectives",
          "Procurement research",
          "Product and industry analysis",
        ]}
      />

      {data.canPublish ? (
        <Section
          tone="soft"
          eyebrow="Super-admin publisher"
          title="Publish Enorsis research and perspectives."
          description="This editorial console is visible only to PLATFORM_SUPER_ADMIN users."
        >
          <form
            action={createPublicationAction}
            className="publisher-form"
          >
            <label>
              Category
              <input
                name="category"
                className="public-form-control"
                placeholder="Responsible AI"
              />
            </label>
            <label>
              Read time
              <input
                name="readTime"
                className="public-form-control"
                placeholder="8 min read"
              />
            </label>
            <label className="publisher-span-2">
              Title
              <input
                required
                name="title"
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
              Publication body
              <textarea
                required
                name="body"
                className="public-form-control publisher-textarea publisher-body"
              />
            </label>
            <label className="form-checkbox-row">
              <input
                type="checkbox"
                name="featured"
              />
              Featured publication
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
                Publish
              </button>
            </div>
          </form>
        </Section>
      ) : null}

      <section id="latest">
        <Section
          eyebrow="Latest thinking"
          title="Research and perspectives from Enorsis."
          description="Explore the operating, technology and governance shifts redefining procurement."
        >
          <div className="publication-responsive-grid">
            {visible.map((post) => (
              <article
                key={post.id}
                className={`managed-content-card ${
                  post.featured
                    ? "managed-content-featured"
                    : ""
                }`}
              >
                <div className="resource-meta">
                  <span>{post.category}</span>
                  <span>
                    {post.readTime ??
                      "Enorsis insight"}
                  </span>
                </div>

                <h2>{post.title}</h2>
                <p>{post.summary}</p>

                <div className="managed-content-footer">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-blue-700">
                    Read publication
                    <ArrowRight size={15} />
                  </span>

                  {"createdByUserId" in post &&
                  data.canPublish ? (
                    <form
                      action={
                        setPublicationStatusAction
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={post.id}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          post.status ===
                          "PUBLISHED"
                            ? "DRAFT"
                            : "PUBLISHED"
                        }
                      />
                      <button className="publisher-mini-button">
                        <FilePenLine size={13} />
                        {post.status ===
                        "PUBLISHED"
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {data.canPublish ? (
            <div className="publisher-access-note">
              <ShieldCheck size={16} />
              Publishing authority: PLATFORM_SUPER_ADMIN only.
            </div>
          ) : null}
        </Section>
      </section>
    </main>
  );
}
