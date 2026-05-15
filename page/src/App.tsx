import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./App.css";
import GlobeDemo from "./GlobeDemo";

// ─── ลงทะเบียน ScrollTrigger plugin ───
gsap.registerPlugin(ScrollTrigger);

// ─── StarField ───
function StarField() {
  useEffect(() => {
    const container = document.querySelector(".stars");
    if (!container) return;

    for (let i = 0; i < 80; i++) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 2 + 0.5;
      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 4}s;
        animation-duration: ${2 + Math.random() * 3}s;
        opacity: ${Math.random() * 0.4 + 0.1};
      `;
      container.appendChild(star);
    }

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return <div className="stars" aria-hidden="true" />;
}

// ─── Hero ───
function Hero() {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const eyebrowRef  = useRef<HTMLParagraphElement>(null);
  const nameRef     = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // fade up ตอน mount
    gsap.fromTo(
      [eyebrowRef.current, nameRef.current, subtitleRef.current],
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.15,
      }
    );

    // mouse parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width  - 0.5;
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;

      gsap.to(eyebrowRef.current, { x: cx * 15, y: cy * 10, duration: 0.8, ease: "power2.out" });
      gsap.to(nameRef.current,    { x: cx * 35, y: cy * 25, duration: 0.6, ease: "power2.out" });
      gsap.to(subtitleRef.current,{ x: cx * 22, y: cy * 15, duration: 0.7, ease: "power2.out" });
    };

    const handleMouseLeave = () => {
      gsap.to(
        [eyebrowRef.current, nameRef.current, subtitleRef.current],
        { x: 0, y: 0, duration: 1.2, ease: "elastic.out(1, 0.5)" }
      );
    };

    section.addEventListener("mousemove",  handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      section.removeEventListener("mousemove",  handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="hero" ref={sectionRef} role="region" aria-label="Hero">
      <div className="hero-content">
        <p className="hero-eyebrow" ref={eyebrowRef}>Hello, I'm</p>
        <h1 ref={nameRef}>Kitisak <span>P.</span></h1>
        <p ref={subtitleRef}>Telecommunication Engineer</p>
        <a href="#read_receipt" className="jump_to_project">
          View My Projects
        </a>
      </div>
    </div>
  );
}

// ─── Hook: fade up ทุก section ที่มี class .reveal ───
function useScrollReveal() {
  useEffect(() => {
    // querySelectorAll หา element ทุกตัวที่มี class reveal
    const elements = gsap.utils.toArray<HTMLElement>(".reveal");

    elements.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 50 },  // เริ่มจากโปร่งใส + เลื่อนลง 50px
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,         // element ไหนที่ trigger
            start: "top 85%",    // เริ่ม animate เมื่อ top ของ element ถึง 85% ของ viewport
            end: "top 40%",
            toggleActions: "play none none none", // play เมื่อเข้า, ไม่ reverse เมื่อออก
          },
        }
      );
    });

    // cleanup ScrollTrigger ทั้งหมดเมื่อ unmount
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);
}

// ─── App ───
export default function App() {
  // เรียก hook scroll reveal
  useScrollReveal();

  return (
    <>
		<StarField />

		<header>
			<nav className="head">
				<div>Kitisak K.</div>
				<ul>
				<li><a href="#about">About</a></li>
				<li><a href="#contact">Contact</a></li>
				</ul>
			</nav>
		</header>

		<Hero />

		{/* ─── เพิ่ม class reveal ทุก section ที่ต้องการ fade in ─── */}
		<section className="about reveal" id="about">
			<h2>About Me</h2>
			<p>Telecommunication engineer passionate about building scalable network solutions.</p>
			{/* ─── ขวา: demo placeholder ─── */}
			<div>
				<GlobeDemo />
			</div>
		</section>

		<section className="read_receipt reveal" id="read_receipt">
			<div className="project-layout">

				{/* ─── ซ้าย: ข้อมูล project ─── */}
				<div className="project-info">
					<p className="section-label">Project 01</p>
					<h2>Income and Expenses</h2>
					<a href="https://read-receipt-vercel.vercel.app/" target="_blank" rel="noopener noreferrer" className="project-link">
						View Project
					</a>
					<p className="project-desc">
						A system for managing and summarizing daily personal finances,
						allowing users to categorize and track spending in a structured way.
						Built with React + TypeScript for the frontend and Supabase (SQL database)
						for backend storage, enabling organized expense management and clear financial insights.
					</p>

					{/* tech badges */}
					<div className="project-tags">
						<span className="badge">React</span>
						<span className="badge">TypeScript</span>
						<span className="badge">Supabase</span>
						<span className="badge">SQL</span>
						<span className="badge">Vercel</span>
					</div>
				</div>

				{/* ─── ขวา: พื้นที่สำหรับ demo component ─── */}
				<div className="project-demo">
				{/* ใส่ component demo ทีหลัง */}
				</div>

			</div>
		</section>

		<section className="Gis reveal" id="gis">
			<div className="project-layout">

				{/* ─── ซ้าย: ข้อมูล project ─── */}
				<div className="project-info">
					<p className="section-label">Project 02</p>
					<h2>Map GIS</h2>
					<a href="" target="_blank" rel="noopener noreferrer" className="project-link">
						View Project
					</a>
					<p className="project-desc">
						Each day, the team is assigned to visit different antenna sites to test signal quality. 
						This project helps estimate the distance between sites, enabling smoother transitions to the next site.	
					</p>

					{/* tech badges */}
					<div className="project-tags">
						<span className="badge">React</span>
						<span className="badge">TypeScript</span>
						<span className="badge">Vercel</span>
					</div>
				</div>

				{/* ─── ขวา: พื้นที่สำหรับ demo component ─── */}
				<div className="project-demo">
				{/* ใส่ component demo ทีหลัง */}
				</div>

			</div>
		</section>

		<section className="sub-project reveal" id="sub-project">
			<p className="section-label">More Projects</p>
			<div className="project-cards">

				<div className="project-card">
					<div className="card-tag">Utility</div>
					<h3>Sub Project A</h3>
					<p>Short description of sub project A.</p>
					</div>

					<div className="project-card">
					<div className="card-tag">Tool</div>
					<h3>Sub Project B</h3>
					<p>Short description of sub project B.</p>
					</div>
					<div className="project-card">
					<div className="card-tag">Script</div>
					<h3>Sub Project C</h3>
					<p>Short description of sub project C.</p>
				</div>
			</div>

		</section>

		<section className="about reveal" id="tech-stack">
			<h2>Tech Stack</h2>
			<span className="badge">React</span>
			<span className="badge">Javascript</span>
			<span className="badge">TypeScript</span>
			<span className="badge">Python</span>
			<span className="badge">Supabase</span>	
			<span className="badge">Vercel</span>
		
		</section>

		<footer>
			<p>&copy; 2026 Kitisak K. All rights reserved.</p>
		</footer>
    </>
  );
}