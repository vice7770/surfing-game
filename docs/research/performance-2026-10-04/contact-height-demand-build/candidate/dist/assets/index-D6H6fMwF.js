const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/jevRecorder-BOcMU1Ll.js","assets/WorkerSurfZone-Ciaa3tIB.js","assets/devStepping-C4ssK5Wh.js","assets/rideRecorder-CAV0PU41.js","assets/waterSheet-B7Sm1p0h.js","assets/particleBench-BKUUa6eD.js"])))=>i.map(i=>d[i]);
import{$r as e,$t as t,A as n,Ar as r,At as i,B as a,Br as o,Bt as s,C as c,Cn as l,Cr as u,Ct as d,D as f,Dn as p,Dr as m,Dt as h,E as g,En as _,Er as v,Et as y,F as b,G as x,Gr as S,Gt as C,H as w,Hr as T,Ht as E,I as D,Ir as O,It as k,Jr as A,Jt as ee,K as te,Kr as j,Kt as ne,L as M,Lr as re,Lt as N,M as ie,Mr as ae,Mt as oe,Nn as P,Nt as se,Or as ce,Ot as le,P as ue,Pn as de,Pr as fe,Pt as pe,Qr as me,Qt as he,R as F,Rr as ge,Rt as I,S as _e,Sn as ve,Sr as ye,St as be,T as xe,Tn as Se,Tt as L,U as Ce,Ur as we,Ut as Te,V as Ee,Vr as R,Vt as De,W as z,Wr as Oe,Wt as ke,Xr as Ae,Xt as B,Y as je,Yr as V,Yt as H,Zr as Me,Zt as U,_ as Ne,_n as W,_t as G,a as Pe,an as Fe,b as Ie,bn as Le,bt as Re,c as ze,cn as Be,d as Ve,dn as He,dr as Ue,dt as We,ei as Ge,en as Ke,f as qe,fn as Je,fr as Ye,ft as Xe,g as Ze,gn as Qe,gr as $e,gt as et,h as K,hn as tt,hr as nt,ht as rt,i as it,in as at,it as ot,jr as st,jt as ct,k as lt,kn as ut,kr as dt,l as ft,ln as pt,m as mt,mn as ht,mr as gt,mt as _t,n as vt,ni as yt,nn as bt,nt as xt,o as St,pn as q,pt as Ct,q as wt,qr as Tt,qt as Et,r as Dt,rt as Ot,s as kt,sn as At,t as jt,ti as J,tn as Mt,u as Nt,un as Pt,ur as Ft,ut as It,v as Y,vn as Lt,vt as Rt,w as zt,wn as Bt,wr as Vt,wt as Ht,x as Ut,xn as Wt,xr as Gt,xt as Kt,y as qt,yn as Jt,yt as Yt,z as Xt,zr as Zt,zt as Qt}from"./WorkerSurfZone-Ciaa3tIB.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function $t(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function en(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var X={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Z={common:{diffuse:{value:new N(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new q}},envmap:{envMap:{value:null},envMapRotation:{value:new q},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new q}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new q}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new q},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new q},normalScale:{value:new o(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new q},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new q}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new q}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new q}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new N(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new R},probesMax:{value:new R},probesResolution:{value:new R}},points:{diffuse:{value:new N(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0},uvTransform:{value:new q}},sprite:{diffuse:{value:new N(16777215)},opacity:{value:1},center:{value:new o(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}}},tn={basic:{uniforms:e([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.fog]),vertexShader:X.meshbasic_vert,fragmentShader:X.meshbasic_frag},lambert:{uniforms:e([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new N(0)},envMapIntensity:{value:1}}]),vertexShader:X.meshlambert_vert,fragmentShader:X.meshlambert_frag},phong:{uniforms:e([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new N(0)},specular:{value:new N(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:X.meshphong_vert,fragmentShader:X.meshphong_frag},standard:{uniforms:e([Z.common,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.roughnessmap,Z.metalnessmap,Z.fog,Z.lights,{emissive:{value:new N(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag},toon:{uniforms:e([Z.common,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.gradientmap,Z.fog,Z.lights,{emissive:{value:new N(0)}}]),vertexShader:X.meshtoon_vert,fragmentShader:X.meshtoon_frag},matcap:{uniforms:e([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,{matcap:{value:null}}]),vertexShader:X.meshmatcap_vert,fragmentShader:X.meshmatcap_frag},points:{uniforms:e([Z.points,Z.fog]),vertexShader:X.points_vert,fragmentShader:X.points_frag},dashed:{uniforms:e([Z.common,Z.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:X.linedashed_vert,fragmentShader:X.linedashed_frag},depth:{uniforms:e([Z.common,Z.displacementmap]),vertexShader:X.depth_vert,fragmentShader:X.depth_frag},normal:{uniforms:e([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,{opacity:{value:1}}]),vertexShader:X.meshnormal_vert,fragmentShader:X.meshnormal_frag},sprite:{uniforms:e([Z.sprite,Z.fog]),vertexShader:X.sprite_vert,fragmentShader:X.sprite_frag},background:{uniforms:{uvTransform:{value:new q},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:X.background_vert,fragmentShader:X.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new q}},vertexShader:X.backgroundCube_vert,fragmentShader:X.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:X.cube_vert,fragmentShader:X.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:X.equirect_vert,fragmentShader:X.equirect_frag},distance:{uniforms:e([Z.common,Z.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:X.distance_vert,fragmentShader:X.distance_frag},shadow:{uniforms:e([Z.lights,Z.fog,{color:{value:new N(0)},opacity:{value:1}}]),vertexShader:X.shadow_vert,fragmentShader:X.shadow_frag}};tn.physical={uniforms:e([tn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new q},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new q},clearcoatNormalScale:{value:new o(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new q},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new q},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new q},sheen:{value:0},sheenColor:{value:new N(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new q},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new q},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new q},transmissionSamplerSize:{value:new o},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new q},attenuationDistance:{value:0},attenuationColor:{value:new N(0)},specularColor:{value:new N(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new q},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new q},anisotropyVector:{value:new o},anisotropyMap:{value:null},anisotropyMapTransform:{value:new q}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag};var nn={r:0,b:0,g:0},rn=new ht,an=new q;an.set(-1,0,0,0,1,0,0,0,1);function on(e,t,n,r,i,a){let o=new N(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new tt(new oe(1,1,1),new Vt({name:`BackgroundCubeMaterial`,uniforms:j(tn.backgroundCube.uniforms),vertexShader:tn.backgroundCube.vertexShader,fragmentShader:tn.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(rn.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(an),l.material.toneMapped=I.getTransfer(i.colorSpace)!==ye,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new tt(new _(2,2),new Vt({name:`BackgroundMaterial`,uniforms:j(tn.background.uniforms),vertexShader:tn.background.vertexShader,fragmentShader:tn.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=I.getTransfer(i.colorSpace)!==ye,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(nn,Me(e)),n.buffers.color.setClear(nn.r,nn.g,nn.b,r,a)}function v(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:v}}function sn(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function cn(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function ln(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(J(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&J(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function un(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Se,s=new q,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var dn=4,fn=6,pn=20,mn=256,hn=new l,gn=new N,_n=null,vn=0,yn=0,bn=!1,xn=new R,Sn=new R,Cn=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=xn}=i;_n=this._renderer.getRenderTarget(),vn=this._renderer.getActiveCubeFace(),yn=this._renderer.getActiveMipmapLevel(),bn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=An(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=kn(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(_n,vn,yn),this._renderer.xr.enabled=bn,e.scissorTest=!1,En(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),_n=this._renderer.getRenderTarget(),vn=this._renderer.getActiveCubeFace(),yn=this._renderer.getActiveMipmapLevel(),bn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Be,minFilter:Be,generateMipmaps:!1,type:Fe,format:P,colorSpace:He,depthBuffer:!1},r=Tn(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Tn(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=wn(r)),this._blurMaterial=On(r,e,t),this._ggxMaterial=Dn(r,e,t)}return r}_compileMaterial(e){let t=new tt(new pe,e);this._renderer.compile(t,hn)}_sceneToCubeUV(e,t,n,r,i){let a=new Bt(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(gn),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new tt(new oe,new Qe({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(gn),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;En(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=An()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=kn());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;En(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,hn)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-dn?n-d+dn:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,En(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,hn),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,En(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,hn)}_blur(e,t,n,r){let i=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(e,i,t,n,a),this._blurPass(i,e,n,n,a)}_blurPass(e,t,n,r,i){let a=this._renderer,o=this._blurMaterial,s=this._lodMeshes[r];s.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=i,c.mipInt.value=this._lodMax-n;let l=this._sizeLods[r];En(t,3*l*(r>this._lodMax-dn?r-this._lodMax+dn:0),4*(this._cubeSize-l),3*l,2*l),a.setRenderTarget(t),a.render(s,hn)}};function wn(e){let t=[],n=[],r=e,i=e-dn+1+fn;for(let e=0;e<i;e++){let e=2**r;t.push(e);let i=1/(e-2),a=-i,o=1+i,s=[a,a,o,a,o,o,a,a,o,o,a,o],c=new Float32Array(108),l=new Float32Array(108);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];c.set(r,18*e);for(let t=0;t<6;t++){let n=s[t*2]*2-1,r=s[t*2+1]*2-1;e===0?Sn.set(1,r,n):e===1?Sn.set(-n,1,-r):e===2?Sn.set(-n,r,1):e===3?Sn.set(-1,r,-n):e===4?Sn.set(-n,-1,r):Sn.set(n,r,-1),Sn.toArray(l,(e*6+t)*3)}}let u=new pe;u.setAttribute(`position`,new se(c,3)),u.setAttribute(`outputDirection`,new se(l,3)),n.push(new tt(u,null)),r>dn&&r--}return{lodMeshes:n,sizeLods:t}}function Tn(e,t,n){let r=new Oe(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function En(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Dn(e,t,n){return new Vt({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:mn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:jn(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function On(e,t,n){return new Vt({name:`SphericalGaussianBlur`,defines:{SAMPLES:pn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:jn(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function kn(){return new Vt({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:jn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function An(){return new Vt({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:jn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function jn(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Mn=class extends Oe{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new De(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new oe(5,5,5),i=new Vt({name:`CubemapFromEquirect`,uniforms:j(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new tt(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=Be),new Qt(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Nn(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Mn(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Cn(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Cn(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Pn(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&yt(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Fn(e,t,n,i){let a={},o=new WeakMap;function s(e){let r=e.target;r.index!==null&&t.remove(r.index);for(let e in r.attributes)t.remove(r.attributes[e]);r.removeEventListener(`dispose`,s),delete a[r.id];let c=o.get(r);c&&(t.remove(c),o.delete(r)),i.releaseStatesOfGeometry(r),r.isInstancedBufferGeometry===!0&&delete r._maxInstanceCount,n.memory.geometries--}function c(e,t){return a[t.id]===!0?t:(t.addEventListener(`dispose`,s),a[t.id]=!0,n.memory.geometries++,t)}function l(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function u(e){let n=[],i=e.index,a=e.attributes.position,s=0;if(a===void 0)return;if(i!==null){let e=i.array;s=i.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=a.array;s=a.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let c=new(a.count>=65535?r:dt)(n,1);c.version=s;let l=o.get(e);l&&t.remove(l),o.set(e,c)}function d(e){let t=o.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&u(e)}else u(e);return o.get(e)}return{get:c,update:l,getWireframeAttribute:d}}function In(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Ln(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:V(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Rn(e,t,n){let r=new WeakMap,i=new T;function a(a,s,c){let l=a.morphTargetInfluences,u=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,d=u===void 0?0:u.length,f=r.get(s);if(f===void 0||f.count!==d){f!==void 0&&f.texture.dispose();let e=s.morphAttributes.position!==void 0,n=s.morphAttributes.normal!==void 0,a=s.morphAttributes.color!==void 0,c=s.morphAttributes.position||[],l=s.morphAttributes.normal||[],u=s.morphAttributes.color||[],p=0;e===!0&&(p=1),n===!0&&(p=2),a===!0&&(p=3);let m=s.attributes.position.count*p,h=1;m>t.maxTextureSize&&(h=Math.ceil(m/t.maxTextureSize),m=t.maxTextureSize);let g=new Float32Array(m*h*4*d),_=new Te(g,m,h,d);_.type=Ke,_.needsUpdate=!0;let v=p*4;for(let t=0;t<d;t++){let r=c[t],o=l[t],s=u[t],d=m*h*4*t;for(let t=0;t<r.count;t++){let c=t*v;e===!0&&(i.fromBufferAttribute(r,t),g[d+c+0]=i.x,g[d+c+1]=i.y,g[d+c+2]=i.z,g[d+c+3]=0),n===!0&&(i.fromBufferAttribute(o,t),g[d+c+4]=i.x,g[d+c+5]=i.y,g[d+c+6]=i.z,g[d+c+7]=0),a===!0&&(i.fromBufferAttribute(s,t),g[d+c+8]=i.x,g[d+c+9]=i.y,g[d+c+10]=i.z,g[d+c+11]=s.itemSize===4?i.w:1)}}f={count:d,texture:_,size:new o(m,h)},r.set(s,f);function y(){_.dispose(),r.delete(s),s.removeEventListener(`dispose`,y)}s.addEventListener(`dispose`,y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<l.length;e++)t+=l[e];let n=s.morphTargetsRelative?1:1-t;c.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),c.getUniforms().setValue(e,`morphTargetInfluences`,l)}c.getUniforms().setValue(e,`morphTargetsTexture`,f.texture,n),c.getUniforms().setValue(e,`morphTargetsTextureSize`,f.size)}return{update:a}}function zn(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Bn={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Vn(e,n,r,i,a,o){let s=new Oe(n,r,{type:e,depthBuffer:a,stencilBuffer:o,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),c=null,u=null,d=new pe;d.setAttribute(`position`,new t([-1,3,0,-1,-1,0,3,-1,0],3)),d.setAttribute(`uv`,new t([0,2,0,0,2,0],2));let f=new Ye({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),p=new tt(d,f),m=new l(-1,1,1,-1,0,1),h=null,g=null,_=!1,v,y=null,b=[],x=!1;this.setSize=function(e,t){s.setSize(e,t),c!==null&&c.setSize(e,t),u!==null&&u.setSize(e,t);for(let n=0;n<b.length;n++){let r=b[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){b=e,x=b.length>0&&b[0].isRenderPass===!0;let t=s.width,n=s.height;b.length>0&&c===null&&(c=new Oe(t,n,{type:Fe,depthBuffer:!1,stencilBuffer:!1}),u=new Oe(t,n,{type:Fe,depthBuffer:!1,stencilBuffer:!1}));for(let e=0;e<b.length;e++){let r=b[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(_||e.toneMapping===0&&b.length===0)return!1;if(y=t,t!==null){let e=t.width,n=t.height;(s.width!==e||s.height!==n)&&this.setSize(e,n)}return x===!1&&e.setRenderTarget(s),v=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return x},this.end=function(e,t){e.toneMapping=v,_=!0;let n=s,r=c;for(let i=0;i<b.length;i++){let a=b[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===c?u:c))}if(h!==e.outputColorSpace||g!==e.toneMapping){h=e.outputColorSpace,g=e.toneMapping,f.defines={},I.getTransfer(h)===`srgb`&&(f.defines.SRGB_TRANSFER=``);let t=Bn[g];t&&(f.defines[t]=``),f.needsUpdate=!0}f.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(y),e.render(p,m),y=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){s.dispose(),c!==null&&c.dispose(),u!==null&&u.dispose(),d.dispose(),f.dispose()}}var Hn=new m,Un=new H(1,1),Wn=new Te,Gn=new E,Kn=new De,qn=[],Jn=[],Yn=new Float32Array(16),Xn=new Float32Array(9),Zn=new Float32Array(4);function Qn(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=qn[i];if(a===void 0&&(a=new Float32Array(i),qn[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function $n(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function er(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function tr(e,t){let n=Jn[t];n===void 0&&(n=new Int32Array(t),Jn[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function nr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function rr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if($n(n,t))return;e.uniform2fv(this.addr,t),er(n,t)}}function ir(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if($n(n,t))return;e.uniform3fv(this.addr,t),er(n,t)}}function ar(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if($n(n,t))return;e.uniform4fv(this.addr,t),er(n,t)}}function or(e,t){let n=this.cache,r=t.elements;if(r===void 0){if($n(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),er(n,t)}else{if($n(n,r))return;Zn.set(r),e.uniformMatrix2fv(this.addr,!1,Zn),er(n,r)}}function sr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if($n(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),er(n,t)}else{if($n(n,r))return;Xn.set(r),e.uniformMatrix3fv(this.addr,!1,Xn),er(n,r)}}function cr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if($n(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),er(n,t)}else{if($n(n,r))return;Yn.set(r),e.uniformMatrix4fv(this.addr,!1,Yn),er(n,r)}}function lr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function ur(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if($n(n,t))return;e.uniform2iv(this.addr,t),er(n,t)}}function dr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if($n(n,t))return;e.uniform3iv(this.addr,t),er(n,t)}}function fr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if($n(n,t))return;e.uniform4iv(this.addr,t),er(n,t)}}function pr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function mr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if($n(n,t))return;e.uniform2uiv(this.addr,t),er(n,t)}}function hr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if($n(n,t))return;e.uniform3uiv(this.addr,t),er(n,t)}}function gr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if($n(n,t))return;e.uniform4uiv(this.addr,t),er(n,t)}}function _r(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Un.compareFunction=n.isReversedDepthBuffer()?518:515,a=Un):a=Hn,n.setTexture2D(t||a,i)}function vr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Gn,i)}function yr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Kn,i)}function br(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Wn,i)}function xr(e){switch(e){case 5126:return nr;case 35664:return rr;case 35665:return ir;case 35666:return ar;case 35674:return or;case 35675:return sr;case 35676:return cr;case 5124:case 35670:return lr;case 35667:case 35671:return ur;case 35668:case 35672:return dr;case 35669:case 35673:return fr;case 5125:return pr;case 36294:return mr;case 36295:return hr;case 36296:return gr;case 35678:case 36198:case 36298:case 36306:case 35682:return _r;case 35679:case 36299:case 36307:return vr;case 35680:case 36300:case 36308:case 36293:return yr;case 36289:case 36303:case 36311:case 36292:return br}}function Sr(e,t){e.uniform1fv(this.addr,t)}function Cr(e,t){let n=Qn(t,this.size,2);e.uniform2fv(this.addr,n)}function wr(e,t){let n=Qn(t,this.size,3);e.uniform3fv(this.addr,n)}function Tr(e,t){let n=Qn(t,this.size,4);e.uniform4fv(this.addr,n)}function Er(e,t){let n=Qn(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Dr(e,t){let n=Qn(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Or(e,t){let n=Qn(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function kr(e,t){e.uniform1iv(this.addr,t)}function Ar(e,t){e.uniform2iv(this.addr,t)}function jr(e,t){e.uniform3iv(this.addr,t)}function Mr(e,t){e.uniform4iv(this.addr,t)}function Nr(e,t){e.uniform1uiv(this.addr,t)}function Pr(e,t){e.uniform2uiv(this.addr,t)}function Fr(e,t){e.uniform3uiv(this.addr,t)}function Ir(e,t){e.uniform4uiv(this.addr,t)}function Lr(e,t,n){let r=this.cache,i=t.length,a=tr(n,i);$n(r,a)||(e.uniform1iv(this.addr,a),er(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Un:Hn;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Rr(e,t,n){let r=this.cache,i=t.length,a=tr(n,i);$n(r,a)||(e.uniform1iv(this.addr,a),er(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Gn,a[e])}function zr(e,t,n){let r=this.cache,i=t.length,a=tr(n,i);$n(r,a)||(e.uniform1iv(this.addr,a),er(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Kn,a[e])}function Br(e,t,n){let r=this.cache,i=t.length,a=tr(n,i);$n(r,a)||(e.uniform1iv(this.addr,a),er(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Wn,a[e])}function Vr(e){switch(e){case 5126:return Sr;case 35664:return Cr;case 35665:return wr;case 35666:return Tr;case 35674:return Er;case 35675:return Dr;case 35676:return Or;case 5124:case 35670:return kr;case 35667:case 35671:return Ar;case 35668:case 35672:return jr;case 35669:case 35673:return Mr;case 5125:return Nr;case 36294:return Pr;case 36295:return Fr;case 36296:return Ir;case 35678:case 36198:case 36298:case 36306:case 35682:return Lr;case 35679:case 36299:case 36307:return Rr;case 35680:case 36300:case 36308:case 36293:return zr;case 36289:case 36303:case 36311:case 36292:return Br}}var Hr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=xr(t.type)}},Ur=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Vr(t.type)}},Wr=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Gr=/(\w+)(\])?(\[|\.)?/g;function Kr(e,t){e.seq.push(t),e.map[t.id]=t}function qr(e,t,n){let r=e.name,i=r.length;for(Gr.lastIndex=0;;){let a=Gr.exec(r),o=Gr.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Kr(n,l===void 0?new Hr(s,e,t):new Ur(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Wr(s),Kr(n,e)),n=e}}}var Jr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);qr(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Yr(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Xr=37297,Zr=0;function Qr(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var $r=new q;function ei(e){I._getMatrix($r,I.workingColorSpace,e);let t=`mat3( ${$r.elements.map(e=>e.toFixed(4))} )`;switch(I.getTransfer(e)){case Je:return[t,`LinearTransferOETF`];case ye:return[t,`sRGBTransferOETF`];default:return J(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function ti(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Qr(e.getShaderSource(t),r)}return i}function ni(e,t){let n=ei(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ri={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function ii(e,t){let n=ri[t];return n===void 0?(J(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var ai=new R;function oi(){return I.getLuminanceCoefficients(ai),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${ai.x.toFixed(4)}, ${ai.y.toFixed(4)}, ${ai.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function si(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(ui).join(`
`)}function ci(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function li(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function ui(e){return e!==``}function di(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function fi(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var pi=/^[ \t]*#include +<([\w\d./]+)>/gm;function mi(e){return e.replace(pi,gi)}var hi=new Map;function gi(e,t){let n=X[t];if(n===void 0){let e=hi.get(t);if(e!==void 0)n=X[e],J(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return mi(n)}var _i=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function vi(e){return e.replace(_i,yi)}function yi(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function bi(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var xi={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Si(e){return xi[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Ci={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function wi(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Ci[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Ti={302:`ENVMAP_MODE_REFRACTION`};function Ei(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Ti[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Di={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Oi(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Di[e.combine]||`ENVMAP_BLENDING_NONE`}function ki(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Ai(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Si(n),l=wi(n),u=Ei(n),d=Oi(n),f=ki(n),p=si(n),m=ci(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(ui).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(ui).join(`
`),_.length>0&&(_+=`
`)):(g=[bi(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(ui).join(`
`),_=[bi(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:X.tonemapping_pars_fragment,n.toneMapping===0?``:ii(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,X.colorspace_pars_fragment,ni(`linearToOutputTexel`,n.outputColorSpace),oi(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(ui).join(`
`)),o=mi(o),o=di(o,n),o=fi(o,n),s=mi(s),s=di(s,n),s=fi(s,n),o=vi(o),s=vi(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=Yr(i,i.VERTEX_SHADER,y),S=Yr(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=ti(i,x,`vertex`),n=ti(i,S,`fragment`);V(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):J(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Jr(i,h),T=li(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,Xr)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Zr++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var ji=0,Mi=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Ni(e),t.set(e,n)),n}},Ni=class{constructor(e){this.id=ji++,this.code=e,this.usedTimes=0}};function Pi(e){return e===1030||e===37490||e===36285}function Fi(e,t,n,r,i,a){let o=new At,s=new Mi,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&J(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=tn[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let ee=e.getRenderTarget(),te=e.state.buffers.depth.getReversed(),j=h.isInstancedMesh===!0,ne=h.isBatchedMesh===!0,M=!!i.map,re=!!i.matcap,N=!!x,ie=!!i.aoMap,ae=!!i.lightMap,oe=!!i.bumpMap&&i.wireframe===!1,P=!!i.normalMap,se=!!i.displacementMap,ce=!!i.emissiveMap,le=!!i.metalnessMap,ue=!!i.roughnessMap,de=i.anisotropy>0,fe=i.clearcoat>0,pe=i.dispersion>0,me=i.retroreflectivity>0,he=i.iridescence>0,F=i.sheen>0,ge=i.transmission>0,_e=de&&!!i.anisotropyMap,ve=fe&&!!i.clearcoatMap,ye=fe&&!!i.clearcoatNormalMap,be=fe&&!!i.clearcoatRoughnessMap,xe=he&&!!i.iridescenceMap,Se=he&&!!i.iridescenceThicknessMap,L=F&&!!i.sheenColorMap,Ce=F&&!!i.sheenRoughnessMap,we=!!i.specularMap,Te=!!i.specularColorMap,Ee=!!i.specularIntensityMap,R=ge&&!!i.transmissionMap,De=ge&&!!i.thicknessMap,z=!!i.gradientMap,Oe=!!i.alphaMap,ke=i.alphaTest>0,Ae=!!i.alphaHash,B=!!i.extensions,je=0;i.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(je=e.toneMapping);let V={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:ne,batchingColor:ne&&h._colorsTexture!==null,instancing:j,instancingColor:j&&h.instanceColor!==null,instancingMorph:j&&h.morphTexture!==null,outputColorSpace:ee===null?e.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:I.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:M,matcap:re,envMap:N,envMapMode:N&&x.mapping,envMapCubeUVHeight:S,aoMap:ie,lightMap:ae,bumpMap:oe,normalMap:P,displacementMap:se,emissiveMap:ce,normalMapObjectSpace:P&&i.normalMapType===1,normalMapTangentSpace:P&&i.normalMapType===0,packedNormalMap:P&&i.normalMapType===0&&Pi(i.normalMap.format),metalnessMap:le,roughnessMap:ue,anisotropy:de,anisotropyMap:_e,clearcoat:fe,clearcoatMap:ve,clearcoatNormalMap:ye,clearcoatRoughnessMap:be,dispersion:pe,retroreflection:me,iridescence:he,iridescenceMap:xe,iridescenceThicknessMap:Se,sheen:F,sheenColorMap:L,sheenRoughnessMap:Ce,specularMap:we,specularColorMap:Te,specularIntensityMap:Ee,transmission:ge,transmissionMap:R,thicknessMap:De,gradientMap:z,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Oe,alphaTest:ke,alphaHash:Ae,combine:i.combine,mapUv:M&&m(i.map.channel),aoMapUv:ie&&m(i.aoMap.channel),lightMapUv:ae&&m(i.lightMap.channel),bumpMapUv:oe&&m(i.bumpMap.channel),normalMapUv:P&&m(i.normalMap.channel),displacementMapUv:se&&m(i.displacementMap.channel),emissiveMapUv:ce&&m(i.emissiveMap.channel),metalnessMapUv:le&&m(i.metalnessMap.channel),roughnessMapUv:ue&&m(i.roughnessMap.channel),anisotropyMapUv:_e&&m(i.anisotropyMap.channel),clearcoatMapUv:ve&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:ye&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:xe&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:Se&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:L&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&m(i.sheenRoughnessMap.channel),specularMapUv:we&&m(i.specularMap.channel),specularColorMapUv:Te&&m(i.specularColorMap.channel),specularIntensityMapUv:Ee&&m(i.specularIntensityMap.channel),transmissionMapUv:R&&m(i.transmissionMap.channel),thicknessMapUv:De&&m(i.thicknessMap.channel),alphaMapUv:Oe&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(P||de),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(M||Oe),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&P===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:te,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:je,decodeVideoTexture:M&&i.map.isVideoTexture===!0&&I.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ce&&i.emissiveMap.isVideoTexture===!0&&I.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:B&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(B&&i.extensions.multiDraw===!0||ne)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return V.vertexUv1s=c.has(1),V.vertexUv2s=c.has(2),V.vertexUv3s=c.has(3),c.clear(),V}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=tn[t];n=st.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Ai(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Ii(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Li(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Ri(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function zi(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Li),r.length>1&&r.sort(t||Ri),i.length>1&&i.sort(t||Ri)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Bi(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new zi,e.set(t,[i])):n>=r.length?(i=new zi,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Vi(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new R,color:new N};break;case`SpotLight`:n={position:new R,direction:new R,color:new N,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new R,color:new N,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new R,skyColor:new N,groundColor:new N};break;case`RectAreaLight`:n={color:new N,position:new R,halfWidth:new R,halfHeight:new R}}return e[t.id]=n,n}}}function Hi(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new o};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new o};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new o,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Ui=0;function Wi(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Gi(e){let t=new Vi,n=Hi(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new R);let i=new R,a=new ht,o=new ht;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(Wi);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Z.LTC_FLOAT_1,r.rectAreaLTC2=Z.LTC_FLOAT_2):(r.rectAreaLTC1=Z.LTC_HALF_1,r.rectAreaLTC2=Z.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=Ui++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function Ki(e){let t=new Gi(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function qi(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Ki(e),t.set(n,[a])):r>=i.length?(a=new Ki(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Ji=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Yi=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Xi=[new R(1,0,0),new R(-1,0,0),new R(0,1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1)],Zi=[new R(0,-1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1),new R(0,-1,0),new R(0,-1,0)],Qi=new ht,$i=new R,ea=new R;function ta(e,t,n){let r=new bt,i=new o,a=new o,c=new T,l=new W,u=new Lt,d={},f=n.maxTextureSize,p={0:1,1:0,2:2},m=new Vt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new o},radius:{value:4}},vertexShader:Ji,fragmentShader:Yi}),h=m.clone();h.defines.HORIZONTAL_PASS=1;let g=new pe;g.setAttribute(`position`,new se(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new tt(g,m),v=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let y=this.type;this.render=function(t,n,o){if(v.enabled===!1||v.autoUpdate===!1&&v.needsUpdate===!1||t.length===0)return;this.type===2&&(J(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let l=e.getRenderTarget(),u=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),p=e.state;p.setBlending(0),p.buffers.depth.getReversed()===!0?p.buffers.color.setClear(0,0,0,0):p.buffers.color.setClear(1,1,1,1),p.buffers.depth.setTest(!0),p.setScissorTest(!1);let m=y!==this.type;m&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let l=0,u=t.length;l<u;l++){let u=t[l],d=u.shadow;if(d===void 0){J(`WebGLShadowMap:`,u,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let h=d.getFrameExtents();i.multiply(h),a.copy(d.mapSize),(i.x>f||i.y>f)&&(i.x>f&&(a.x=Math.floor(f/h.x),i.x=a.x*h.x,d.mapSize.x=a.x),i.y>f&&(a.y=Math.floor(f/h.y),i.y=a.y*h.y,d.mapSize.y=a.y));let g=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=g,d.map===null||m===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(u.isPointLight){J(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Oe(i.x,i.y,{format:Ft,type:Fe,minFilter:Be,magFilter:Be,generateMipmaps:!1}),d.map.texture.name=u.name+`.shadowMap`,d.map.depthTexture=new H(i.x,i.y,Ke),d.map.depthTexture.name=u.name+`.shadowMapDepth`,d.map.depthTexture.format=Et,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Le,d.map.depthTexture.magFilter=Le}else u.isPointLight?(d.map=new Mn(i.x),d.map.depthTexture=new s(i.x,O)):(d.map=new Oe(i.x,i.y),d.map.depthTexture=new H(i.x,i.y,O)),d.map.depthTexture.name=u.name+`.shadowMap`,d.map.depthTexture.format=Et,this.type===1?(d.map.depthTexture.compareFunction=g?518:515,d.map.depthTexture.minFilter=Be,d.map.depthTexture.magFilter=Be):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Le,d.map.depthTexture.magFilter=Le);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let _=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();u.isPointLight!==!0&&d.updateMatrices(u,o);for(let t=0;t<_;t++){let i=d.getCamera(t);if(u.isPointLight){let e=d.camera,n=d.matrix,r=u.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),$i.setFromMatrixPosition(u.matrixWorld),e.position.copy($i),ea.copy(e.position),ea.add(Xi[t]),e.up.copy(Zi[t]),e.lookAt(ea),e.updateMatrixWorld(),n.makeTranslation(-$i.x,-$i.y,-$i.z),Qi.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(Qi,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);c.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),p.viewport(c)}r=d.getFrustum(t),S(n,o,i,u,this.type)}d.isPointLightShadow!==!0&&this.type===3&&b(d,o),d.needsUpdate=!1}y=this.type,v.needsUpdate=!1,e.setRenderTarget(l,u,d)};function b(n,r){let a=t.update(_);m.defines.VSM_SAMPLES!==n.blurSamples&&(m.defines.VSM_SAMPLES=n.blurSamples,h.defines.VSM_SAMPLES=n.blurSamples,m.needsUpdate=!0,h.needsUpdate=!0),n.mapPass===null?n.mapPass=new Oe(i.x,i.y,{format:Ft,type:Fe}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),m.uniforms.shadow_pass.value=n.map.depthTexture,m.uniforms.resolution.value.set(n.map.width,n.map.height),m.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,m,_,null),h.uniforms.shadow_pass.value=n.mapPass.texture,h.uniforms.resolution.value.set(n.map.width,n.map.height),h.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,h,_,null)}function x(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=d[e];r===void 0&&(r={},d[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,C)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?p[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function S(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=x(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=x(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)S(c[e],i,a,o,s)}function C(e){e.target.removeEventListener(`dispose`,C);for(let t in d){let n=d[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function na(e,t){function n(){let t=!1,n=new T,r=null,i=new T(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?de(e.DEPTH_TEST):fe(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=$e[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?de(e.STENCIL_TEST):fe(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new N(0,0,0),E=0,D=!1,O=null,k=null,A=null,ee=null,te=null,j=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),ne=!1,M=0,re=e.getParameter(e.VERSION);re.indexOf(`WebGL`)===-1?re.indexOf(`OpenGL ES`)!==-1&&(M=parseFloat(/^OpenGL ES (\d)/.exec(re)[1]),ne=M>=2):(M=parseFloat(/^WebGL (\d)/.exec(re)[1]),ne=M>=1);let ie=null,ae={},oe=e.getParameter(e.SCISSOR_BOX),P=e.getParameter(e.VIEWPORT),se=new T().fromArray(oe),ce=new T().fromArray(P);function le(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ue={};ue[e.TEXTURE_2D]=le(e.TEXTURE_2D,e.TEXTURE_2D,1),ue[e.TEXTURE_CUBE_MAP]=le(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ue[e.TEXTURE_2D_ARRAY]=le(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ue[e.TEXTURE_3D]=le(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),de(e.DEPTH_TEST),o.setFunc(3),ve(!1),ye(1),de(e.CULL_FACE),I(0);function de(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function fe(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function pe(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function me(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function he(t){return h!==t&&(e.useProgram(t),h=t,!0)}let F={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};F[103]=e.MIN,F[104]=e.MAX;let ge={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function I(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(fe(e.BLEND),g=!1);return}if(g===!1&&(de(e.BLEND),g=!0),t!==5){if(t!==_||u!==D){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:V(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:V(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:V(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:V(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),E=0,_=t,D=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(F[n],F[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(ge[r],ge[i],ge[o],ge[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==E)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),E=l),_=t,D=!1}function _e(t,n){t.side===2?fe(e.CULL_FACE):de(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ve(r),t.blending===1&&t.transparent===!1?I(0):I(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),xe(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?de(e.SAMPLE_ALPHA_TO_COVERAGE):fe(e.SAMPLE_ALPHA_TO_COVERAGE)}function ve(t){O!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),O=t)}function ye(t){t===0?fe(e.CULL_FACE):(de(e.CULL_FACE),t!==k&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),k=t}function be(t){t!==A&&(ne&&e.lineWidth(t),A=t)}function xe(t,n,r){t?(de(e.POLYGON_OFFSET_FILL),(ee!==n||te!==r)&&(ee=n,te=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):fe(e.POLYGON_OFFSET_FILL)}function Se(t){t?de(e.SCISSOR_TEST):fe(e.SCISSOR_TEST)}function L(t){t===void 0&&(t=e.TEXTURE0+j-1),ie!==t&&(e.activeTexture(t),ie=t)}function Ce(t,n,r){r===void 0&&(r=ie===null?e.TEXTURE0+j-1:ie);let i=ae[r];i===void 0&&(i={type:void 0,texture:void 0},ae[r]=i),(i.type!==t||i.texture!==n)&&(ie!==r&&(e.activeTexture(r),ie=r),e.bindTexture(t,n||ue[t]),i.type=t,i.texture=n)}function we(){let t=ae[ie];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Te(){try{e.compressedTexImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ee(){try{e.compressedTexImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function R(){try{e.texSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function De(){try{e.texSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function z(){try{e.compressedTexSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Oe(){try{e.compressedTexSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function ke(){try{e.texStorage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ae(){try{e.texStorage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function B(){try{e.texImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function je(){try{e.texImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function H(t){return d[t]===void 0?e.getParameter(t):d[t]}function Me(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function U(t){se.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),se.copy(t))}function Ne(t){ce.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ce.copy(t))}function W(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function G(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Pe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},ie=null,ae={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new N(0,0,0),E=0,D=!1,O=null,k=null,A=null,ee=null,te=null,se.set(0,0,e.canvas.width,e.canvas.height),ce.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:de,disable:fe,bindFramebuffer:pe,drawBuffers:me,useProgram:he,setBlending:I,setMaterial:_e,setFlipSided:ve,setCullFace:ye,setLineWidth:be,setPolygonOffset:xe,setScissorTest:Se,activeTexture:L,bindTexture:Ce,unbindTexture:we,compressedTexImage2D:Te,compressedTexImage3D:Ee,texImage2D:B,texImage3D:je,pixelStorei:Me,getParameter:H,updateUBOMapping:W,uniformBlockBinding:G,texStorage2D:ke,texStorage3D:Ae,texSubImage2D:R,texSubImage3D:De,compressedTexSubImage2D:z,compressedTexSubImage3D:Oe,scissor:U,viewport:Ne,reset:Pe}}function ra(e,t,n,r,i,a,s){let c=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,l=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),u=new o,d=new WeakMap,f=new Set,p,m=new WeakMap,h=!1;try{h=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function g(e,t){return h?new OffscreenCanvas(e,t):A(`canvas`)}function _(e,t,n){let r=1,i=z(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);p===void 0&&(p=g(n,a));let o=t?g(n,a):p;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),J(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&J(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function v(e){return e.generateMipmaps}function y(t){e.generateMipmap(t)}function b(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function x(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];J(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||J(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?Je:I.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function S(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,J(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function C(e,t){return v(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function w(e){let t=e.target;t.removeEventListener(`dispose`,w),E(t),t.isVideoTexture&&d.delete(t),t.isHTMLTexture&&f.delete(t)}function T(e){let t=e.target;t.removeEventListener(`dispose`,T),O(t)}function E(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=m.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&D(e),Object.keys(i).length===0&&m.delete(n)}r.remove(e)}function D(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=m.get(i);delete a[n.__cacheKey],s.memory.textures--}function O(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),s.memory.textures--),r.remove(i[t])}r.remove(t)}let te=0;function j(){te=0}function ne(){return te}function M(e){te=e}function re(){let e=te;return e>=i.maxTextures&&J(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),te+=1,e}function N(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function ie(t,i){let a=r.get(t);if(t.isVideoTexture&&R(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)J(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)J(`WebGLRenderer: Texture marked for update but image is incomplete`);else{me(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function ae(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){me(a,t,i);return}t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function oe(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){me(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function P(t,i){let a=r.get(t);if(t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version){he(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let se={[nt]:e.REPEAT,[k]:e.CLAMP_TO_EDGE,[Jt]:e.MIRRORED_REPEAT},ce={[Le]:e.NEAREST,[ve]:e.NEAREST_MIPMAP_NEAREST,[Wt]:e.NEAREST_MIPMAP_LINEAR,[Be]:e.LINEAR,[Pt]:e.LINEAR_MIPMAP_NEAREST,[pt]:e.LINEAR_MIPMAP_LINEAR},le={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function ue(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&J(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,se[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,se[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,se[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,ce[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,ce[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,le[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function de(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,w));let i=n.source,a=m.get(i);a===void 0&&(a={},m.set(i,a));let o=N(n);if(o!==t.__cacheKey){a[o]===void 0&&(a[o]={texture:e.createTexture(),usedTimes:0},s.memory.textures++,r=!0),a[o].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&D(n)),t.__cacheKey=o,t.__webglTexture=a[o].texture}return r}function fe(e,t,n){return Math.floor(Math.floor(e/n)/t)}function pe(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=fe(n.start,r.width,4),c=fe(t.start,r.width,4);n.start<=i+1&&a===c&&fe(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function me(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=de(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let d=r.get(u);if(u.version!==d.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=I.getPrimaries(I.workingColorSpace),r=o.colorSpace===``?null:I.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=_(o.image,!1,i.maxTextureSize);t=De(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=x(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);ue(c,o);let h,g=o.mipmaps,b=o.isVideoTexture!==!0,w=d.__version===void 0||l===!0,T=u.dataReady,E=C(o,t);if(o.isDepthTexture)m=S(o.format===ee,o.type),w&&(b?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(g.length>0){b&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],b?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else b?(w&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&pe(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){b&&w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,g[0].width,g[0].height,t.depth);for(let i=0,a=g.length;i<a;i++)if(h=g[i],o.format!==1023){if(r!==null){if(b){if(T){if(o.layerUpdates.size>0){let t=Ae(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0)}else J(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else b?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{b&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],o.format===1023?b?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?J(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):b?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(o.isDataArrayTexture){if(b){if(w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T){if(o.layerUpdates.size>0){let i=Ae(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)b?(w&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(w){if(b)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),f.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of f)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(g.length>0){if(b&&w){let t=z(g[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=g.length;t<i;t++)h=g[t],b?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(b){if(w){let r=z(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);v(o)&&y(c),d.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function he(t,o,s){if(o.image.length!==6)return;let c=de(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=I.getPrimaries(I.workingColorSpace),r=o.colorSpace===``?null:I.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=_(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=De(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),b=a.convert(o.type),S=x(o.internalFormat,g,b,o.normalized,o.colorSpace),w=o.isVideoTexture!==!0,T=u.__version===void 0||c===!0,E=l.dataReady,D=C(o,h);ue(e.TEXTURE_CUBE_MAP,o);let O;if(f){w&&T&&n.texStorage2D(e.TEXTURE_CUBE_MAP,D,S,h.width,h.height);for(let t=0;t<6;t++){O=m[t].mipmaps;for(let r=0;r<O.length;r++){let i=O[r];o.format===1023?w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,b,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,S,i.width,i.height,0,g,b,i.data):g===null?J(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):w?E&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,S,i.width,i.height,0,i.data)}}}else{if(O=o.mipmaps,w&&T){O.length>0&&D++;let t=z(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,D,S,t.width,t.height)}for(let t=0;t<6;t++)if(p){w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,b,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,S,m[t].width,m[t].height,0,g,b,m[t].data);for(let r=0;r<O.length;r++){let i=O[r].image[t].image;w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,b,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,S,i.width,i.height,0,g,b,i.data)}}else{w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,b,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,S,g,b,m[t]);for(let r=0;r<O.length;r++){let i=O[r];w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,b,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,S,g,b,i.image[t])}}}v(o)&&y(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function F(t,i,o,s,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=x(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Ee(i)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,s,l,h.__webglTexture,0,Te(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,s,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function ge(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=S(n.stencilBuffer,a),s=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Ee(n)?c.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Te(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Te(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,s,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],s=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=x(o.internalFormat,s,l,o.normalized,o.colorSpace);Ee(n)?c.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Te(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Te(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function _e(t,i,o){let s=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let l=r.get(i.depthTexture);if(l.__renderTarget=i,(!l.__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),s){if(l.__webglInit===void 0&&(l.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,w)),l.__webglTexture===void 0){l.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,l.__webglTexture),ue(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=a.convert(i.depthTexture.format),r=a.convert(i.depthTexture.type),o;i.depthTexture.format===1026?o=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(o=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,o,i.width,i.height,0,t,r,null)}}else ie(i.depthTexture,0);let u=l.__webglTexture,d=Te(i),f=s?e.TEXTURE_CUBE_MAP_POSITIVE_X+o:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)Ee(i)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)Ee(i)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function ye(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)_e(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?_e(i.__webglFramebuffer[0],t,0):_e(i.__webglFramebuffer,t,0)}}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),ge(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),ge(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function be(t,n,i){let a=r.get(t);n!==void 0&&F(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&ye(t)}function xe(t){let i=t.texture,o=r.get(t),c=r.get(i);t.addEventListener(`dispose`,T);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,s.memory.textures++),u){o.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){o.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)o.__webglFramebuffer[t][n]=e.createFramebuffer()}else o.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){o.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)o.__webglFramebuffer[t]=e.createFramebuffer()}else o.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),s.memory.textures++)}if(t.samples>0&&Ee(t)===!1){o.__webglMultisampledFramebuffer=e.createFramebuffer(),o.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,o.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];o.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,o.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),s=a.convert(r.type),c=x(r.internalFormat,i,s,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=Te(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,o.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(o.__webglDepthRenderbuffer=e.createRenderbuffer(),ge(o.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),ue(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)F(o.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else F(o.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);v(i)&&y(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],s=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,s.__webglTexture),ue(c,a),F(o.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),v(a)&&y(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),ue(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)F(o.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else F(o.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);v(i)&&y(r),n.unbindTexture()}t.depthBuffer&&ye(t)}function Se(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(v(a)){let t=b(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),y(t),n.unbindTexture()}}}let L=[],Ce=[];function we(t){if(t.samples>0){if(Ee(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,c=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer);let f=t.texture.mipmaps;f&&f.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),l===!0&&(L.length=0,Ce.length=0,L.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&(L.push(c),Ce.push(c),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,Ce)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,L))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&l){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function Te(e){return Math.min(i.maxSamples,e.samples)}function Ee(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function R(e){let t=s.render.frame;d.get(e)!==t&&(d.set(e,t),e.update())}function De(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(I.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&J(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):V(`WebGLTextures: Unsupported texture color space:`,n)),t}function z(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(u.width=e.naturalWidth||e.width,u.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(u.width=e.displayWidth,u.height=e.displayHeight):(u.width=e.width,u.height=e.height),u}this.allocateTextureUnit=re,this.resetTextureUnits=j,this.getTextureUnits=ne,this.setTextureUnits=M,this.setTexture2D=ie,this.setTexture2DArray=ae,this.setTexture3D=oe,this.setTextureCube=P,this.rebindTextures=be,this.setupRenderTarget=xe,this.updateRenderTargetMipmap=Se,this.updateMultisampleRenderTarget=we,this.setupDepthRenderbuffer=ye,this.setupFrameBufferTexture=F,this.useMultisampledRTT=Ee,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function ia(e,t){function n(n,r=``){let i,a=I.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var aa=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,oa=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,sa=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new he(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Vt({vertexShader:aa,fragmentShader:oa,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new tt(new _(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},ca=class extends U{constructor(e,t){super();let n=this,r=null,i=1,a=null,s=`local-floor`,c=1,l=null,u=null,d=null,f=null,p=null,m=null,h=typeof XRWebGLBinding<`u`,g=new sa,_={},v=t.getContextAttributes(),y=null,b=null,x=[],C=[],w=new o,E=null,D=null,k=new Bt;k.viewport=new T;let A=new Bt;A.viewport=new T;let te=[k,A],j=new ct,ne=null,M=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=x[e];return t===void 0&&(t=new S,x[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=x[e];return t===void 0&&(t=new S,x[e]=t),t.getGripSpace()},this.getHand=function(e){let t=x[e];return t===void 0&&(t=new S,x[e]=t),t.getHandSpace()};function re(e){let t=C.indexOf(e.inputSource);if(t===-1)return;let n=x[t];n!==void 0&&(n.update(e.inputSource,e.frame,l||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function N(){r.removeEventListener(`select`,re),r.removeEventListener(`selectstart`,re),r.removeEventListener(`selectend`,re),r.removeEventListener(`squeeze`,re),r.removeEventListener(`squeezestart`,re),r.removeEventListener(`squeezeend`,re),r.removeEventListener(`end`,N),r.removeEventListener(`inputsourceschange`,ie);for(let e=0;e<x.length;e++){let t=C[e];t!==null&&(C[e]=null,x[e].disconnect(t))}ne=null,M=null,g.reset();for(let e in _)delete _[e];if(e.setRenderTarget(y),p=null,f=null,d=null,r=null,b=null,me.stop(),n.isPresenting=!1,e.setPixelRatio(E),e.setSize(w.width,w.height,!1),D!==null){let e=D.camera;e.fov=D.fov,e.zoom=D.zoom,e.updateProjectionMatrix(),D=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&J(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){s=e,n.isPresenting===!0&&J(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(e){l=e},this.getBaseLayer=function(){return f===null?p:f},this.getBinding=function(){return d===null&&h&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(o){if(r=o,r!==null){if(y=e.getRenderTarget(),r.addEventListener(`select`,re),r.addEventListener(`selectstart`,re),r.addEventListener(`selectend`,re),r.addEventListener(`squeeze`,re),r.addEventListener(`squeezestart`,re),r.addEventListener(`squeezeend`,re),r.addEventListener(`end`,N),r.addEventListener(`inputsourceschange`,ie),v.xrCompatible!==!0&&await t.makeXRCompatible(),E=e.getPixelRatio(),e.getSize(w),h&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;v.depth&&(o=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=v.stencil?ee:Et,a=v.stencil?fe:O);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};d=this.getBinding(),f=d.createProjectionLayer(s),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),b=new Oe(f.textureWidth,f.textureHeight,{format:P,type:ae,depthTexture:new H(f.textureWidth,f.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}else{let n={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:i};p=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),b=new Oe(p.framebufferWidth,p.framebufferHeight,{format:P,type:ae,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(s),me.setContext(r),me.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function ie(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=C.indexOf(n);r>=0&&(C[r]=null,x[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=C.indexOf(n);if(r===-1){for(let e=0;e<x.length;e++)if(e>=C.length){C.push(n),r=e;break}else if(C[e]===null){C[e]=n,r=e;break}if(r===-1)break}let i=x[r];i&&i.connect(n)}}let oe=new R,se=new R;function ce(e,t,n){oe.setFromMatrixPosition(t.matrixWorld),se.setFromMatrixPosition(n.matrixWorld);let r=oe.distanceTo(se),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function le(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;g.texture!==null&&(g.depthNear>0&&(t=g.depthNear),g.depthFar>0&&(n=g.depthFar)),j.near=A.near=k.near=t,j.far=A.far=k.far=n,(ne!==j.near||M!==j.far)&&(r.updateRenderState({depthNear:j.near,depthFar:j.far}),ne=j.near,M=j.far),j.layers.mask=e.layers.mask|6,k.layers.mask=j.layers.mask&-5,A.layers.mask=j.layers.mask&-3;let i=e.parent,a=j.cameras;le(j,i);for(let e=0;e<a.length;e++)le(a[e],i);a.length===2?ce(j,k,A):j.projectionMatrix.copy(k.projectionMatrix),D===null&&e.isPerspectiveCamera&&(D={camera:e,fov:e.fov,zoom:e.zoom}),ue(e,j,i)};function ue(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=ut*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return j},this.getFoveation=function(){if(f!==null||p!==null)return c},this.setFoveation=function(e){c=e,f!==null&&(f.fixedFoveation=e),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=e)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(j)},this.getCameraTexture=function(e){return _[e]};let de=null;function pe(t,i){if(u=i.getViewerPose(l||a),m=i,u!==null){let t=u.views;p!==null&&(e.setRenderTargetFramebuffer(b,p.framebuffer),e.setRenderTarget(b));let i=!1;t.length!==j.cameras.length&&(j.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(p!==null)a=p.getViewport(r);else{let t=d.getViewSubImage(f,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(b,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(b))}let o=te[n];o===void 0&&(o=new Bt,o.layers.enable(n),o.viewport=new T,te[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(j.matrix.copy(o.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale)),i===!0&&j.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&h){d=n.getBinding();let e=d.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&g.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&h){e.state.unbindTexture(),d=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=_[n];e||(e=new he,_[n]=e);let t=d.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<x.length;e++){let t=C[e],n=x[e];t!==null&&n!==void 0&&n.update(t,i,l||a)}de&&de(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),m=null}let me=new $t;me.setAnimationLoop(pe),this.setAnimationLoop=function(e){de=e},this.dispose=function(){}}},la=new ht,ua=new q;ua.set(-1,0,0,0,1,0,0,0,1);function da(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Me(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(la.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(ua),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function fa(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return V(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?J(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):J(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var pa=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ma=null;function ha(){return ma===null&&(ma=new ke(pa,16,16,Ft,Fe),ma.name=`DFG_LUT`,ma.minFilter=Be,ma.magFilter=Be,ma.wrapS=k,ma.wrapT=k,ma.generateMipmaps=!1,ma.needsUpdate=!0),ma}var ga=class{constructor(e={}){let{canvas:t=Tt(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=ae}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([de,Ue,gt]),g=new Set([ae,O,Zt,fe,re,ge]),_=new Uint32Array(4),v=new Int32Array(4),y=new R,b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let E=this,D=!1,k=null,A=null,ee=null,te=null;this._outputColorSpace=Gt;let j=0,ne=0,M=null,ie=-1,oe=null,P=new T,se=new T,ce=null,le=new N(0),ue=0,pe=t.width,he=t.height,F=1,_e=null,ve=null,ye=new T(0,0,pe,he),be=new T(0,0,pe,he),xe=!1,Se=new bt,L=!1,Ce=!1,Te=new ht,Ee=new R,De=new T,z={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ke=!1;function Ae(){return M===null?F:1}let B=n;function je(e,n){return t.getContext(e,n)}let H,Me,U,Ne,W,G,Pe,Ie,Le,Re,ze,Be,Ve,He,We,Ke,qe,Je,Ye,Xe,Ze,Qe,$e;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r186`),t.addEventListener(`webglcontextlost`,tt,!1),t.addEventListener(`webglcontextrestored`,nt,!1),t.addEventListener(`webglcontextcreationerror`,rt,!1),B===null){let t=`webgl2`;if(B=je(t,e),B===null)throw je(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}et()}catch(e){throw t.removeEventListener(`webglcontextlost`,tt,!1),t.removeEventListener(`webglcontextrestored`,nt,!1),t.removeEventListener(`webglcontextcreationerror`,rt,!1),V(`WebGLRenderer: `+e.message),e}function et(){H=new Pn(B),H.init(),Ze=new ia(B,H),Me=new ln(B,H,e,Ze),U=new na(B,H),Me.reversedDepthBuffer&&d&&U.buffers.depth.setReversed(!0),A=B.createFramebuffer(),ee=B.createFramebuffer(),te=B.createFramebuffer(),Ne=new Ln(B),W=new Ii,G=new ra(B,H,U,W,Me,Ze,Ne),Pe=new Nn(E),Ie=new en(B),Qe=new sn(B,Ie),Le=new Fn(B,Ie,Ne,Qe),Re=new zn(B,Le,Ie,Qe,Ne),Je=new Rn(B,Me,G),We=new un(W),ze=new Fi(E,Pe,H,Me,Qe,We),Be=new da(E,W),Ve=new Bi,He=new qi(H),qe=new on(E,Pe,U,Re,p,s),Ke=new ta(E,Re,Me),$e=new fa(B,Ne,Me,U),Ye=new cn(B,H,Ne),Xe=new In(B,H,Ne),Ne.programs=ze.programs,E.capabilities=Me,E.extensions=H,E.properties=W,E.renderLists=Ve,E.shadowMap=Ke,E.state=U,E.info=Ne}m!==1009&&(w=new Vn(m,t.width,t.height,o,r,i));let K=new ca(E,B);this.xr=K,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let e=H.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=H.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return F},this.setPixelRatio=function(e){e!==void 0&&(F=e,this.setSize(pe,he,!1))},this.getSize=function(e){return e.set(pe,he)},this.setSize=function(e,n,r=!0){if(K.isPresenting){J(`WebGLRenderer: Can't change size while VR device is presenting.`);return}pe=e,he=n,t.width=Math.floor(e*F),t.height=Math.floor(n*F),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(pe*F,he*F).floor()},this.setDrawingBufferSize=function(e,n,r){pe=e,he=n,F=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009){V(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){J(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(P)},this.getViewport=function(e){return e.copy(ye)},this.setViewport=function(e,t,n,r){e.isVector4?ye.set(e.x,e.y,e.z,e.w):ye.set(e,t,n,r),U.viewport(P.copy(ye).multiplyScalar(F).round())},this.getScissor=function(e){return e.copy(be)},this.setScissor=function(e,t,n,r){e.isVector4?be.set(e.x,e.y,e.z,e.w):be.set(e,t,n,r),U.scissor(se.copy(be).multiplyScalar(F).round())},this.getScissorTest=function(){return xe},this.setScissorTest=function(e){U.setScissorTest(xe=e)},this.setOpaqueSort=function(e){_e=e},this.setTransparentSort=function(e){ve=e},this.getClearColor=function(e){return e.copy(qe.getClearColor())},this.setClearColor=function(){qe.setClearColor(...arguments)},this.getClearAlpha=function(){return qe.getClearAlpha()},this.setClearAlpha=function(){qe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(M!==null){let t=M.texture.format;e=h.has(t)}if(e){let e=M.texture.type,t=g.has(e),n=qe.getClearColor(),r=qe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,B.clearBufferuiv(B.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,B.clearBufferiv(B.COLOR,0,v))}else r|=B.COLOR_BUFFER_BIT}t&&(r|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&B.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),k=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,tt,!1),t.removeEventListener(`webglcontextrestored`,nt,!1),t.removeEventListener(`webglcontextcreationerror`,rt,!1),qe.dispose(),Ve.dispose(),He.dispose(),W.dispose(),Pe.dispose(),Re.dispose(),Qe.dispose(),$e.dispose(),ze.dispose(),K.dispose(),K.removeEventListener(`sessionstart`,ut),K.removeEventListener(`sessionend`,dt),ft.stop()};function tt(e){e.preventDefault(),me(`WebGLRenderer: Context Lost.`),D=!0}function nt(){me(`WebGLRenderer: Context Restored.`),D=!1;let e=Ne.autoReset,t=Ke.enabled,n=Ke.autoUpdate,r=Ke.needsUpdate,i=Ke.type;et(),Ne.autoReset=e,Ke.enabled=t,Ke.autoUpdate=n,Ke.needsUpdate=r,Ke.type=i}function rt(e){V(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function it(e){let t=e.target;t.removeEventListener(`dispose`,it),at(t)}function at(e){ot(e),W.remove(e)}function ot(e){let t=W.get(e).programs;t!==void 0&&(t.forEach(function(e){ze.releaseProgram(e)}),e.isShaderMaterial&&ze.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=z);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Et(e,t,n,r,i);U.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Le.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Qe.setup(i,r,s,n,c);let h,g=Ye;if(c!==null&&(h=Ie.get(c),g=Xe,g.setIndex(h)),i.isMesh)r.wireframe===!0?(U.setLineWidth(r.wireframeLinewidth*Ae()),g.setMode(B.LINES)):g.setMode(B.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),U.setLineWidth(e*Ae()),i.isLineSegments?g.setMode(B.LINES):i.isLineLoop?g.setMode(B.LINE_LOOP):g.setMode(B.LINE_STRIP)}else i.isPoints?g.setMode(B.POINTS):i.isSprite&&g.setMode(B.TRIANGLES);if(i.isBatchedMesh){if(H.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Ie.get(c).bytesPerElement:1,o=W.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(B,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function st(e,t,n,r){k!==null&&e.isNodeMaterial&&k.setObject(r,e),L===!0&&We.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,St(e,t,r),e.side=0,e.needsUpdate=!0,St(e,t,r),e.side=2):St(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),k!==null&&k.renderStart(e,t,n),x=He.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),k!==null&&k.updateLights(x.state.lightsArray),Ce=this.localClippingEnabled,L=We.init(this.clippingPlanes,Ce),L===!0&&We.setGlobalState(this.clippingPlanes,t),k!==null&&Ke.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];st(o,n,t,e),r.add(o)}else st(i,n,t,e),r.add(i)}}),x=C.pop(),k!==null&&k.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){let t=W.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}H.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let ct=null;function lt(e){ct&&ct(e)}function ut(){ft.stop()}function dt(){ft.start()}let ft=new $t;ft.setAnimationLoop(lt),typeof self<`u`&&ft.setContext(self),this.setAnimationLoop=function(e){ct=e,K.setAnimationLoop(e),e===null?ft.stop():ft.start()},K.addEventListener(`sessionstart`,ut),K.addEventListener(`sessionend`,dt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){V(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(D===!0)return;k!==null&&k.renderStart(e,t);let n=K.enabled===!0&&K.isPresenting===!0,r=w!==null&&(M===null||n)&&w.begin(E,M);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),K.enabled===!0&&K.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(K.cameraAutoUpdate===!0&&K.updateCamera(t),t=K.getCamera()),e.isScene===!0&&e.onBeforeRender(E,e,t,M),x=He.get(e,C.length),x.init(t),x.state.textureUnits=G.getTextureUnits(),C.push(x),Te.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),Se.setFromProjectionMatrix(Te,we,t.reversedDepth),Ce=this.localClippingEnabled,L=We.init(this.clippingPlanes,Ce),b=Ve.get(e,S.length),b.init(),S.push(b),K.enabled===!0&&K.isPresenting===!0){let e=E.xr.getDepthSensingMesh();e!==null&&mt(e,t,-1/0,E.sortObjects)}mt(e,t,0,E.sortObjects),b.finish(),k!==null&&k.updateLights(x.state.lightsArray),E.sortObjects===!0&&b.sort(_e,ve),ke=K.enabled===!1||K.isPresenting===!1||K.hasDepthSensing()===!1,ke&&qe.addToRenderList(b,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),L===!0&&We.beginShadows();let i=x.state.shadowsArray;if(Ke.render(i,e,t),L===!0&&We.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];vt(n,r,e,a)}ke&&qe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];_t(b,e,n,n.viewport)}}else r.length>0&&vt(n,r,e,t),ke&&qe.render(e),_t(b,e,t)}M!==null&&ne===0&&(G.updateMultisampleRenderTarget(M),G.updateRenderTargetMipmap(M)),r&&w.end(E),e.isScene===!0&&e.onAfterRender(E,e,t),Qe.resetDefaultState(),ie=-1,oe=null,C.pop(),C.length>0?(x=C[C.length-1],G.setTextureUnits(x.state.textureUnits),L===!0&&We.setGlobalState(E.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,k!==null&&k.renderEnd()};function mt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)x.pushLightProbeGrid(e);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||e.intersectsFrustum(Se)){r&&De.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Te);let i=Re.update(e),a=e.material;a.visible&&b.push(e,i,a,n,De.z,null,t)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||e.intersectsFrustum(Se))){let i=Re.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),De.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),De.copy(e.boundingSphere.center)),De.applyMatrix4(e.matrixWorld).applyMatrix4(Te)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,De.z,s,t)}}else a.visible&&b.push(e,i,a,n,De.z,null,t)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)mt(i[e],t,n,r)}function _t(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),L===!0&&We.setGlobalState(E.clippingPlanes,n),r&&U.viewport(P.copy(r)),i.length>0&&yt(i,t,n),a.length>0&&yt(a,t,n),o.length>0&&yt(o,t,n),U.buffers.depth.setTest(!0),U.buffers.depth.setMask(!0),U.buffers.color.setMask(!0),U.setPolygonOffset(!1)}function vt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=H.has(`EXT_color_buffer_half_float`)||H.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new Oe(1,1,{generateMipmaps:!0,type:e?Fe:ae,minFilter:pt,samples:Math.max(4,Me.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:I.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||P;a.setSize(o.z*E.transmissionResolutionScale,o.w*E.transmissionResolutionScale);let s=E.getRenderTarget(),c=E.getActiveCubeFace(),l=E.getActiveMipmapLevel();E.setRenderTarget(a),E.getClearColor(le),ue=E.getClearAlpha(),ue<1&&E.setClearColor(16777215,.5),E.clear(),ke&&qe.render(n);let u=E.toneMapping;E.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),L===!0&&We.setGlobalState(E.clippingPlanes,r),yt(e,n,r),G.updateMultisampleRenderTarget(a),G.updateRenderTargetMipmap(a),H.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,xt(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(G.updateMultisampleRenderTarget(a),G.updateRenderTargetMipmap(a))}E.setRenderTarget(s,c,l),E.setClearColor(le,ue),d!==void 0&&(r.viewport=d),E.toneMapping=u}function yt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&xt(o,t,n,s,l,c)}}function xt(e,t,n,r,i,a){k!==null&&i.isNodeMaterial&&k.setObject(e,i),e.onBeforeRender(E,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(E,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,E.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,E.renderBufferDirect(n,t,r,i,e,a),i.side=2):E.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(E,t,n,r,i,a)}function St(e,t,n){t.isScene!==!0&&(t=z);let r=W.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=ze.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=ze.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Pe.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,it),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Ct(e,s),d}else s.uniforms=ze.getUniforms(e),k!==null&&e.isNodeMaterial&&k.build(e,n,s),e.onBeforeCompile(s,E),d=ze.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=We.uniform),Ct(e,s),r.needsLights=Ot(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=x.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function q(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Jr.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Ct(e,t){let n=W.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function wt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];y.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(y))return n}return null}function Et(e,t,n,r,i){t.isScene!==!0&&(t=z),G.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=M===null?E.outputColorSpace:M.isXRRenderTarget===!0?M.texture.colorSpace:I.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Pe.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(M===null||M.isXRRenderTarget===!0)&&(h=E.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=W.get(r),y=x.state.lights;if(L===!0&&(Ce===!0||e!==oe)){let t=e===oe&&r.id===ie;We.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==We.numPlanes||v.numIntersection!==We.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=x.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let S=v.currentProgram;b===!0&&(S=St(r,t,i),k&&r.isNodeMaterial&&k.onUpdateProgram(r,S,v));let C=!1,w=!1,T=!1,D=S.getUniforms(),O=v.uniforms;if(U.useProgram(S.program)&&(C=!0,w=!0,T=!0),r.id!==ie&&(ie=r.id,w=!0),v.needsLights){let e=wt(x.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,w=!0)}if(C||oe!==e){U.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),D.setValue(B,`projectionMatrix`,e.projectionMatrix),D.setValue(B,`viewMatrix`,e.matrixWorldInverse);let t=D.map.cameraPosition;t!==void 0&&t.setValue(B,Ee.setFromMatrixPosition(e.matrixWorld)),Me.logarithmicDepthBuffer&&D.setValue(B,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&D.setValue(B,`isOrthographic`,e.isOrthographicCamera===!0),oe!==e&&(oe=e,w=!0,T=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&D.setValue(B,`sunShadowMap`,y.state.sunShadowMap,G),y.state.directionalShadowMap.length>0&&D.setValue(B,`directionalShadowMap`,y.state.directionalShadowMap,G),y.state.spotShadowMap.length>0&&D.setValue(B,`spotShadowMap`,y.state.spotShadowMap,G),y.state.pointShadowMap.length>0&&D.setValue(B,`pointShadowMap`,y.state.pointShadowMap,G)),i.isSkinnedMesh){D.setOptional(B,i,`bindMatrix`),D.setOptional(B,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),D.setValue(B,`boneTexture`,e.boneTexture,G))}i.isBatchedMesh&&(D.setOptional(B,i,`batchingTexture`),D.setValue(B,`batchingTexture`,i._matricesTexture,G),D.setOptional(B,i,`batchingIdTexture`),D.setValue(B,`batchingIdTexture`,i._indirectTexture,G),D.setOptional(B,i,`batchingColorTexture`),i._colorsTexture!==null&&D.setValue(B,`batchingColorTexture`,i._colorsTexture,G));let A=n.morphAttributes;if((A.position!==void 0||A.normal!==void 0||A.color!==void 0)&&Je.update(i,n,S),(w||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,D.setValue(B,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(O.envMapIntensity.value=t.environmentIntensity),O.dfgLUT!==void 0&&(O.dfgLUT.value=ha()),w){if(D.setValue(B,`toneMappingExposure`,E.toneMappingExposure),v.needsLights&&Dt(O,T),a&&r.fog===!0&&Be.refreshFogUniforms(O,a),Be.refreshMaterialUniforms(O,r,F,he,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;O.probesSH.value=e.texture,O.probesMin.value.copy(e.boundingBox.min),O.probesMax.value.copy(e.boundingBox.max),O.probesResolution.value.copy(e.resolution)}Jr.upload(B,q(v),O,G)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Jr.upload(B,q(v),O,G),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&D.setValue(B,`center`,i.center),D.setValue(B,`modelViewMatrix`,i.modelViewMatrix),D.setValue(B,`normalMatrix`,i.normalMatrix),D.setValue(B,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];$e.update(n,S),$e.bind(n,S)}}return S}function Dt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return j},this.getActiveMipmapLevel=function(){return ne},this.getRenderTarget=function(){return M},this.setRenderTargetTextures=function(e,t,n){let r=W.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),W.get(e.texture).__webglTexture=t,W.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=W.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){M=e,j=t,ne=n;let r=null,i=!1,a=!1;if(e){let o=W.get(e);if(o.__useDefaultFramebuffer!==void 0){U.bindFramebuffer(B.FRAMEBUFFER,o.__webglFramebuffer),P.copy(e.viewport),se.copy(e.scissor),ce=e.scissorTest,U.viewport(P),U.scissor(se),U.setScissorTest(ce),ie=-1;return}if(o.__webglFramebuffer===void 0)G.setupRenderTarget(e);else if(o.__hasExternalTextures)G.rebindTextures(e,W.get(e.texture).__webglTexture,W.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&W.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);G.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=W.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&G.useMultisampledRTT(e)===!1?W.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,P.copy(e.viewport),se.copy(e.scissor),ce=e.scissorTest}else P.copy(ye).multiplyScalar(F).floor(),se.copy(be).multiplyScalar(F).floor(),ce=xe;if(n!==0&&(r=A),U.bindFramebuffer(B.FRAMEBUFFER,r)&&U.drawBuffers(e,r),U.viewport(P),U.scissor(se),U.setScissorTest(ce),i){let r=W.get(e.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=W.get(e.textures[t]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=W.get(e.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,t.__webglTexture,n)}ie=-1};function kt(e){let t=W.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Me.textureFormatReadable(e.format),t.__typeReadable=Me.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=W.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){U.bindFramebuffer(B.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+s);let u=kt(o);if(u.__formatReadable===!1){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&B.readPixels(t,n,r,i,Ze.convert(c),Ze.convert(l),a)}finally{let e=M===null?null:W.get(M).__webglFramebuffer;U.bindFramebuffer(B.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=W.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){U.bindFramebuffer(B.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+s);let d=kt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,f),B.bufferData(B.PIXEL_PACK_BUFFER,a.byteLength,B.STREAM_READ),B.readPixels(t,n,r,i,Ze.convert(l),Ze.convert(u),0),B.bindBuffer(B.PIXEL_PACK_BUFFER,null);let p=M===null?null:W.get(M).__webglFramebuffer;U.bindFramebuffer(B.FRAMEBUFFER,p);let m=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Ge(B,m,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,f),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,a),B.bindBuffer(B.PIXEL_PACK_BUFFER,null),B.deleteBuffer(f),B.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;G.setTexture2D(e,0),B.copyTexSubImage2D(B.TEXTURE_2D,n,0,0,o,s,i,a),U.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Ze.convert(t.format),_=Ze.convert(t.type),v;t.isData3DTexture?(G.setTexture3D(t,0),v=B.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(G.setTexture2DArray(t,0),v=B.TEXTURE_2D_ARRAY):(G.setTexture2D(t,0),v=B.TEXTURE_2D),U.activeTexture(B.TEXTURE0),U.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,t.flipY),U.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),U.pixelStorei(B.UNPACK_ALIGNMENT,t.unpackAlignment);let y=U.getParameter(B.UNPACK_ROW_LENGTH),b=U.getParameter(B.UNPACK_IMAGE_HEIGHT),x=U.getParameter(B.UNPACK_SKIP_PIXELS),S=U.getParameter(B.UNPACK_SKIP_ROWS),C=U.getParameter(B.UNPACK_SKIP_IMAGES);U.pixelStorei(B.UNPACK_ROW_LENGTH,h.width),U.pixelStorei(B.UNPACK_IMAGE_HEIGHT,h.height),U.pixelStorei(B.UNPACK_SKIP_PIXELS,l),U.pixelStorei(B.UNPACK_SKIP_ROWS,u),U.pixelStorei(B.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=W.get(e),r=W.get(t),h=W.get(n.__renderTarget),g=W.get(r.__renderTarget);U.bindFramebuffer(B.READ_FRAMEBUFFER,h.__webglFramebuffer),U.bindFramebuffer(B.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,W.get(e).__webglTexture,i,d+n),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,W.get(t).__webglTexture,a,m+n)),B.blitFramebuffer(l,u,o,s,f,p,o,s,B.DEPTH_BUFFER_BIT,B.NEAREST);U.bindFramebuffer(B.READ_FRAMEBUFFER,null),U.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||W.has(e)){let n=W.get(e),r=W.get(t);U.bindFramebuffer(B.READ_FRAMEBUFFER,ee),U.bindFramebuffer(B.DRAW_FRAMEBUFFER,te);for(let e=0;e<c;e++)w?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,n.__webglTexture,i),T?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,r.__webglTexture,a),i===0?T?B.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):B.copyTexSubImage2D(v,a,f,p,l,u,o,s):B.blitFramebuffer(l,u,o,s,f,p,o,s,B.COLOR_BUFFER_BIT,B.NEAREST);U.bindFramebuffer(B.READ_FRAMEBUFFER,null),U.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?B.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?B.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):B.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):B.texSubImage2D(B.TEXTURE_2D,a,f,p,o,s,g,_,h);U.pixelStorei(B.UNPACK_ROW_LENGTH,y),U.pixelStorei(B.UNPACK_IMAGE_HEIGHT,b),U.pixelStorei(B.UNPACK_SKIP_PIXELS,x),U.pixelStorei(B.UNPACK_SKIP_ROWS,S),U.pixelStorei(B.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&B.generateMipmap(v),U.unbindTexture()},this.initRenderTarget=function(e){W.get(e).__webglFramebuffer===void 0&&G.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?G.setTextureCube(e,0):e.isData3DTexture?G.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?G.setTexture2DArray(e,0):G.setTexture2D(e,0),U.unbindTexture()},this.resetState=function(){j=0,ne=0,M=null,U.reset(),Qe.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return we}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=I._getDrawingBufferColorSpace(e),t.unpackColorSpace=I._getUnpackColorSpace()}},_a=[`paddle`,`popUp`,`steerLeft`,`steerRight`,`trimForward`,`trimBack`,`crouch`,`compress`,`hand`,`duckDive`,`retry`,`camera`,`mute`,`callLeft`,`callRight`,`callParty`,`callNice`,`pause`],va={paddle:`prone`,popUp:`always`,steerLeft:`always`,steerRight:`always`,trimForward:`standing`,trimBack:`standing`,crouch:`standing`,compress:`standing`,hand:`standing`,duckDive:`prone`,retry:`always`,camera:`always`,mute:`always`,pause:`always`,callLeft:`always`,callRight:`always`,callParty:`always`,callNice:`always`};function ya(e,t){let n=va[e],r=va[t];return n===`always`||r===`always`||n===r}var ba=_a.filter(e=>e!==`pause`),xa={keyboard:{paddle:[`Space`,`ArrowUp`],popUp:[`Enter`],steerLeft:[`ArrowLeft`,`KeyA`],steerRight:[`ArrowRight`,`KeyD`],trimForward:[`KeyW`,`ArrowUp`],trimBack:[`KeyS`,`ArrowDown`],crouch:[`ShiftLeft`,`ShiftRight`],compress:[`Space`],hand:[`KeyE`],duckDive:[`KeyS`,`ArrowDown`],retry:[`KeyR`],camera:[`KeyC`],mute:[`KeyM`],callLeft:[`Digit1`],callRight:[`Digit2`],callParty:[`Digit3`],callNice:[`Digit4`],pause:[`Escape`]},gamepad:{paddle:[7],popUp:[0,18],steerLeft:[14],steerRight:[15],trimForward:[12],trimBack:[13],crouch:[6],compress:[7],hand:[4,17],duckDive:[6,13],retry:[3],camera:[5],mute:[8],callLeft:[10],callRight:[11],callParty:[2],callNice:[1],pause:[9]}},Sa=`Escape`,Ca=9,wa=new Set;function Ta(e){return wa.add(e),()=>{wa.delete(e)}}function Ea(e=()=>globalThis.navigator?.getGamepads?.()??[]){let t=[];for(let n of Array.from(e()))n&&n.connected&&t.push({id:`gamepad:${n.index}`,kind:`standard`,buttons:n.buttons.map(e=>e.pressed),values:n.buttons.map(e=>e.value),axes:[...n.axes]});for(let e of wa)t.push(...e());return t}function Da(e,t,n){let r=new Set;for(let i of _a)(n.keyboard[i].some(t=>e.has(t))||t.some(e=>n.gamepad[i].some(t=>e.buttons[t])))&&r.add(i);return r}function Oa(e,t){if(t===void 0)return 0;let n=0;for(let r of e)n=Math.max(n,r.values?.[t]??+!!r.buttons[t]);return Math.min(1,Math.max(0,n))}function ka(e,t,n){let r=e[t];return r[n].filter(e=>!_a.some(t=>t!==n&&ya(n,t)&&r[t].includes(e)))}function Aa(e,t,n,r,i){if(n===`pause`||i===(t===`keyboard`?Sa:Ca))return e;let a=e[t],o=a[n][r];if(o===i)return e;let s={...a},c=[...a[n]],l=c.indexOf(i);l>=0&&(c[l]=o),c[r]=i,s[n]=c.filter(e=>e!==void 0);let u=_a.find(e=>e!==n&&ya(n,e)&&a[e].includes(i));if(u){let t=[...a[u]],n=t.indexOf(i);if(o===void 0?t.splice(n,1):t[n]=o,t.length===0)return e;s[u]=t}return{...e,[t]:s}}var ja={ArrowUp:`↑`,ArrowDown:`↓`,ArrowLeft:`←`,ArrowRight:`→`},Ma={Shift:`Shift`,Control:`Ctrl`,Alt:`Alt`,Meta:`Cmd`};function Na(e){if(e===void 0)return`—`;if(ja[e])return ja[e];let t=/^Key([A-Z])$/.exec(e);if(t)return t[1];let n=/^Digit(\d)$/.exec(e);if(n)return n[1];let r=/^(Shift|Control|Alt|Meta)(Left|Right)$/.exec(e);return r?Ma[r[1]]:e}var Pa=[`A`,`B`,`X`,`Y`,`LB`,`RB`,`LT`,`RT`,`Back`,`Start`,`L3`,`R3`,`D-pad↑`,`D-pad↓`,`D-pad←`,`D-pad→`,`Home`,`L4`,`R4`,`L5`,`R5`,`···`],Fa={8:`View`,9:`Menu`,16:`Steam`};function Ia(e,t=`standard`){return e===void 0?`—`:(t===`steam`?Fa[e]:void 0)??Pa[e]??`Button ${e}`}var La=.2,Ra=class{current=0;get value(){return this.current}update(e,t){let n=Math.max(0,t)/La,r=e-this.current;return this.current=Math.abs(r)<=n?e:this.current+Math.sign(r)*n,this.current}raise(e){this.current=Math.max(this.current,Math.min(1,e))}reset(){this.current=0}},za={trimStick:`right`,stickResponse:`linear`,deadzoneSteam:.05,deadzoneGamepad:.15},Ba=.3,Va=.6,Ha=.5;function Ua(e,t,n){let r=Math.abs(e);if(r<=t)return 0;let i=Math.min(1,(r-t)/(1-t)),a=n===`precise`?.4*i+Va*i**3:i;return Math.sign(e)*a}function Wa(e,t){if(!e)return{steer:0,trim:0,rotate:0};let n=e.kind===`steam`?t.deadzoneSteam:t.deadzoneGamepad,r=t.trimStick===`right`?3:1;return{steer:Ua(e.axes[0]??0,n,t.stickResponse),trim:Ua(-(e.axes[r]??0),n,t.stickResponse),rotate:Ua(e.axes[2]??0,n,t.stickResponse)}}function Ga(e,t){if(e===`steerLeft`||e===`steerRight`)return`left`;if(e===`trimForward`||e===`trimBack`)return t.trimStick}function Ka(e,t){return e.id??`pad:${t}`}function qa(e){return e.buttons.some(Boolean)||e.axes.slice(0,4).some(e=>Math.abs(e)>Ha)}function Ja(e,t){let n=e.map(Ka),r=n.filter((t,n)=>qa(e[n]));return t!==void 0&&r.includes(t)?t:r.length>0?r[0]:t!==void 0&&n.includes(t)?t:n[0]}var Ya={callLeft:`left`,callRight:`right`,callParty:`party`,callNice:`nice`},Xa=new Set([`INPUT`,`BUTTON`,`SELECT`,`TEXTAREA`]),Za=.05,Qa={paddle:!1,steer:0,getUp:!1},$a=class{bindings;handlers;held=new Set;padHeld=new Set;padPrevious=new Set;padSteerValue=0;padTrimValue=0;padRotateValue=0;padCrouchValue=0;padCompressValue=0;padDuckValue=0;touchPaddle=!1;touchLeft=!1;touchRight=!1;touchCrouch=!1;touchCompress=!1;compressStale=!1;ramps={steer:new Ra,trim:new Ra,crouch:new Ra,compress:new Ra,duckDive:new Ra};lastRequest={paddle:!1,popUp:!1,steer:0,trim:0,crouch:0,compress:0,hand:!1,duckDive:0,reel:!1};getUpRequested=!1;active=!0;lastDevice=`keyboard`;lastPadKind=`standard`;driving;stick;pads;constructor(e,t,n={}){this.bindings=e,this.handlers=t;let r=n.target??globalThis.window;this.pads=n.pads??(()=>Ea()),this.stick=n.stick??(()=>za),r.addEventListener(`keydown`,e=>this.keyDown(e)),r.addEventListener(`keyup`,e=>{this.held.delete(e.code)}),r.addEventListener(`blur`,()=>this.release());let i=n.document??globalThis.document;i&&(this.bindTouchButton(i,`touch-paddle`,e=>{this.touchPaddle=e}),this.bindTouchButton(i,`touch-left`,e=>{this.touchLeft=e}),this.bindTouchButton(i,`touch-right`,e=>{this.touchRight=e}),this.bindTouchButton(i,`touch-crouch`,e=>{this.touchCrouch=e}),this.bindTouchButton(i,`touch-compress`,e=>{this.touchCompress=e}))}get enabled(){return this.active}set enabled(e){this.active=e,e||this.release()}get input(){if(!this.active)return Qa;let e=Da(this.held,[],this.bindings()),t=t=>e.has(t)||this.padHeld.has(t),n=Number(t(`steerRight`)||this.touchRight)-Number(t(`steerLeft`)||this.touchLeft);return{paddle:t(`paddle`)||this.touchPaddle,steer:this.padSteerValue===0?n:this.padSteerValue,getUp:this.getUpRequested}}rideRequest(e,t){let n=this.active?Da(this.held,[],this.bindings()):new Set,r=e=>this.active&&(n.has(e)||this.padHeld.has(e)),i=e=>this.active&&e,a=Number(r(`steerRight`)||i(this.touchRight))-Number(r(`steerLeft`)||i(this.touchLeft)),o=t?Number(r(`trimForward`))-Number(r(`trimBack`)):0,s=t&&(r(`crouch`)||i(this.touchCrouch))?1:0,c=r(`compress`)||i(this.touchCompress)||this.active&&this.padCompressValue>0;t?c||(this.compressStale=!1):this.compressStale=c;let l=t&&!this.compressStale,u=l&&(r(`compress`)||i(this.touchCompress))?1:0,d=!t&&this.active&&n.has(`duckDive`)?1:0,f=this.ramps.steer.update(a,e),p=this.ramps.trim.update(o,e);u&&this.ramps.compress.raise(this.ramps.crouch.value);let m=this.ramps.crouch.update(s,e),h=this.ramps.compress.update(u,e),g=this.ramps.duckDive.update(d,e),_=this.active;return this.lastRequest={paddle:!t&&(r(`paddle`)||i(this.touchPaddle)),popUp:this.active&&this.getUpRequested,steer:_&&this.padSteerValue!==0?this.padSteerValue:f,trim:t&&_&&this.padTrimValue!==0?this.padTrimValue:p,crouch:t&&_?Math.max(this.padCrouchValue,m):m,compress:l&&_?Math.max(this.padCompressValue,h):h,hand:t&&r(`hand`),rotate:t&&_&&this.lastDevice===`gamepad`?this.padRotateValue:void 0,duckDive:t?0:Math.max(_?this.padDuckValue:0,g),reel:!t&&r(`popUp`)},this.lastRequest}requestGetUp(){this.getUpRequested=!0}consumeGetUp(){this.getUpRequested=!1}poll(){let e=this.pads(),t=Da(new Set,e,this.bindings());this.driving=Ja(e,this.driving);let n=e.find(qa);if(n&&(this.lastDevice=`gamepad`,this.lastPadKind=n.kind??`standard`),this.active){for(let e of t)this.padPrevious.has(e)||this.press(e);this.padHeld=t;let n=Wa(e.find((e,t)=>Ka(e,t)===this.driving),this.stick());this.padSteerValue=n.steer,this.padTrimValue=n.trim,this.padRotateValue=n.rotate,this.padCrouchValue=Oa(e,this.bindings().gamepad.crouch[0]);let r=Oa(e,this.bindings().gamepad.compress[0]);this.padCompressValue=r<Za?0:r,this.padDuckValue=Math.max(0,...this.bindings().gamepad.duckDive.map(t=>Oa(e,t)))}this.padPrevious=t}keyDown(e){let t=e.target?.tagName;if(t&&Xa.has(t)&&!this.bindings().keyboard.pause.includes(e.code)||(this.lastDevice=`keyboard`,!this.active))return;let n=Da(new Set([e.code]),[],this.bindings());if((n.size>0||e.code===`Space`)&&e.preventDefault(),!e.repeat&&!this.held.has(e.code))for(let e of n)this.press(e);this.held.add(e.code)}press(e){e===`popUp`?this.getUpRequested=!0:e===`retry`?this.handlers.retry():e===`camera`?this.handlers.camera():e===`pause`?this.handlers.pause():e===`mute`?this.handlers.mute?.():Ya[e]&&this.handlers.call?.(Ya[e])}release(){this.held.clear(),this.padHeld=new Set,this.padSteerValue=0,this.padTrimValue=0,this.padRotateValue=0,this.padCrouchValue=0,this.padCompressValue=0,this.padDuckValue=0,this.touchPaddle=!1,this.touchLeft=!1,this.touchRight=!1,this.touchCrouch=!1,this.touchCompress=!1,this.getUpRequested=!1}bindTouchButton(e,t,n){let r=e.getElementById(t);if(!r)return;r.addEventListener(`pointerdown`,e=>{e.preventDefault(),r.setPointerCapture(e.pointerId),n(!0),r.classList.add(`is-held`)});let i=()=>{n(!1),r.classList.remove(`is-held`)};r.addEventListener(`pointerup`,i),r.addEventListener(`pointercancel`,i),r.addEventListener(`lostpointercapture`,i)}},eo=10462,to=[4866,4867,4868,4869],no=65280,ro=2,io=new Set([66,69,71]),ao=new Set([70,121]),oo=63,so=135,co=9,lo={a:1,b:2,x:4,y:8,quickAccess:16,rightStick:32,menu:64,r4:128,r5:256,rb:512,down:1024,right:2048,left:4096,up:8192,view:16384,leftStick:32768,steam:65536,l4:131072,l5:262144,lb:524288},uo=[lo.a,lo.b,lo.x,lo.y,lo.lb,lo.rb,0,0,lo.view,lo.menu,lo.leftStick,lo.rightStick,lo.up,lo.down,lo.left,lo.right,lo.steam,lo.l4,lo.r4,lo.l5,lo.r5,lo.quickAccess],fo=.12;function po(e,t){if(!(!io.has(e)||t.byteLength<17))return{buttons:t.getUint32(1,!0),leftTrigger:t.getInt16(5,!0),rightTrigger:t.getInt16(7,!0),leftX:t.getInt16(9,!0),leftY:t.getInt16(11,!0),rightX:t.getInt16(13,!0),rightY:t.getInt16(15,!0)}}function mo(e,t){if(!ao.has(e)||t.byteLength<1)return;let n=t.getUint8(0);return n===2?`connected`:n===1?`disconnected`:void 0}var ho=e=>Math.max(-1,Math.min(1,e/32767)),go=e=>0-ho(e);function _o(e,t){let n=Math.max(0,ho(e.leftTrigger)),r=Math.max(0,ho(e.rightTrigger)),i=uo.map((t,i)=>i===6?n:i===7?r:(e.buttons&t)===0?0:1);return{id:t,kind:`steam`,buttons:i.map((e,t)=>t===6||t===7?e>fo:e>0),values:i,axes:[ho(e.leftX),go(e.leftY),ho(e.rightX),go(e.rightY)]}}function vo(e){return e.vendorId===10462&&to.includes(e.productId)&&e.collections.some(e=>e.usagePage===65280&&e.usage!==ro)}function yo(e){for(let t of e){let e=(t.featureReports?.find(e=>e.reportId===1))?.items?.reduce((e,t)=>e+(t.reportSize??0)*(t.reportCount??0),0)??0;if(e>0)return Math.ceil(e/8)}return oo}function bo(e,t=oo){let n=new Uint8Array(t);return n.set([so,3,co,+!!e,0]),n}function xo(){return globalThis.navigator?.hid}var So=1e3,Co=class{slots=[];listeners=new Set;hid;page;now;every;nextIndex=0;started=!1;wasConnected=!1;constructor(e={}){this.hid=`hid`in e?e.hid:xo(),this.page=e.page??globalThis.document,this.now=e.now??(()=>performance.now()),this.every=e.every??((e,t)=>{setInterval(e,t)})}get status(){return this.hid?this.live().length>0?`connected`:`disconnected`:`unsupported`}pads(){return this.live().map(e=>_o(e.state,`steam:${e.index}`))}onChange(e){return this.listeners.add(e),()=>{this.listeners.delete(e)}}async start(){if(this.hid&&!this.started){this.started=!0,this.hid.addEventListener(`connect`,e=>void this.open(e.device)),this.hid.addEventListener(`disconnect`,e=>this.drop(e.device)),this.page?.addEventListener(`visibilitychange`,()=>this.sendLizard(this.hidden())),this.every(()=>this.tick(),So);for(let e of await this.hid.getDevices())await this.open(e)}}async request(){if(!this.hid)return!1;await this.start();let e;try{e=await this.hid.requestDevice({filters:to.map(e=>({vendorId:eo,productId:e,usagePage:no}))})}catch{return!1}for(let t of e)await this.open(t);return e.some(vo)}live(){let e=this.now();return this.slots.filter(t=>t.state!==void 0&&e-t.at<=1e3)}hidden(){return this.page?.visibilityState===`hidden`}async open(e){if(!vo(e)||this.slots.some(t=>t.device===e))return;let t={device:e,index:this.nextIndex++,at:0};this.slots.push(t),e.addEventListener(`inputreport`,e=>this.report(t,e));try{e.opened||await e.open()}catch{this.slots.splice(this.slots.indexOf(t),1)}}report(e,t){let n=po(t.reportId,t.data);if(n){let t=!this.live().includes(e);e.state=n,e.at=this.now(),t&&(this.sendLizardTo(e,this.hidden()),this.changed());return}mo(t.reportId,t.data)===`disconnected`&&e.state&&(e.state=void 0,this.changed())}drop(e){let t=this.slots.findIndex(t=>t.device===e);if(t<0)return;let[n]=this.slots.splice(t,1);n.state&&this.changed()}tick(){this.hidden()||this.sendLizard(!1),this.live().length>0!==this.wasConnected&&this.changed()}sendLizard(e){for(let t of this.live())this.sendLizardTo(t,e)}sendLizardTo(e,t){e.device.sendFeatureReport(1,bo(t,yo(e.device.collections))).catch(()=>void 0)}changed(){this.wasConnected=this.live().length>0;for(let e of this.listeners)e()}};function wo(e,t,n){return n<=0||e-t>=n-1}function To(e,t,n){return n<=0||t===0?e:t+Math.max(1,Math.floor((e-t+1)/n))*n}var Eo={low:{renderScale:.75,nativePixelDensity:!1,frameLimit:60,waterSimulation:`auto`,seaDetail:`standard`,caustics:!1,sprayMist:!1,oceanView:`near`,foam:`simple`,waterLook:`classic`,particles:`low`},medium:{renderScale:1,nativePixelDensity:!1,frameLimit:60,waterSimulation:`auto`,seaDetail:`standard`,caustics:!0,sprayMist:!0,oceanView:`far`,foam:`detailed`,waterLook:`rich`,particles:`medium`},high:{renderScale:1,nativePixelDensity:!0,frameLimit:60,waterSimulation:`auto`,seaDetail:`rich`,caustics:!0,sprayMist:!0,oceanView:`far`,foam:`detailed`,waterLook:`rich`,particles:`high`},ultra:{renderScale:1.25,nativePixelDensity:!0,frameLimit:60,waterSimulation:`auto`,seaDetail:`rich`,caustics:!0,sprayMist:!0,oceanView:`far`,foam:`detailed`,waterLook:`rich`,particles:`high`}},Do={low:{shadows:`blob`,surferLodDistance:0,textureCap:512},medium:{shadows:`rider`,surferLodDistance:8,textureCap:1024},high:{shadows:`surfaces`,surferLodDistance:12,textureCap:2048},ultra:{shadows:`soft`,surferLodDistance:20,textureCap:2048}},Oo=[`waterSimulation`,`seaDetail`];function ko(e,t,n){return t===`custom`?{...e,preset:t}:{preset:t,...t===`auto`?Eo[n?.preset??`medium`]:Eo[t]}}function Ao(e,t){return{...e,...t,preset:`custom`}}function jo(e){return{lodDistance:1/0,textureCap:e.textureCap}}var Mo=1.75;function No(e,t,n){let r=e.nativePixelDensity?Math.min(Math.max(1,n||1),Mo):1,i=e.waterSimulation===`auto`?t?.water??`accurate`:e.waterSimulation,a=e.preset===`auto`?t?.preset??`medium`:e.preset;return{pixelRatio:r*e.renderScale,frameInterval:e.frameLimit===`screen`?0:1e3/e.frameLimit,stage:i===`fast`?1:2,compute:i===`fast`?`cpu`:`auto`,richSea:e.seaDetail===`rich`,caustics:e.caustics,sprayMist:e.sprayMist,oceanView:e.oceanView,detailedFoam:e.foam===`detailed`,waterLook:e.waterLook,particles:e.particles,stillBackdrop:a===`low`,...Do[a===`custom`?t?.preset??`medium`:a]}}var Po=1.5;function Fo(e,t){if(e.length===0)return 0;let n=[...e].sort((e,t)=>e-t);return n[Math.min(n.length-1,Math.floor(t*n.length))]}function Io(e){let t=Fo(e.frameIntervals,.1),n=e.frameIntervals.length===0?0:e.frameIntervals.filter(e=>e>Po*t).length/e.frameIntervals.length,r=e.stepMs.length===0||Fo(e.stepMs,.5)<=15?`accurate`:`fast`;return{preset:n<=.05?e.gpuCompute?`high`:`medium`:`low`,water:r,lowPerformance:n>.25}}var Lo=class{intervals=[];steps=[];counted=0;gpu=!1;add(e,t,n){!(e>0)||e>250||(this.intervals.push(e),this.counted+=e,t!==void 0&&Number.isFinite(t)&&t>0&&this.steps.push(t),this.gpu=n)}get done(){return this.counted>=6e3}result(){return Io({frameIntervals:this.intervals,stepMs:this.steps,gpuCompute:this.gpu})}};function Ro(e,t,n){return e.preset===`auto`&&(!t||t.adapter!==n)}function zo(e){let t=e.getExtension(`WEBGL_debug_renderer_info`),n=t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):e.getParameter(e.RENDERER);return typeof n==`string`?n:`unknown`}function Bo(e){let t=e.toUpperCase().replace(/[\s-]/g,``);if(t.length===8){for(let e of t)if(!`23456789ABCDEFGHJKMNPQRSTUVWXYZ`.includes(e))return;return t}}function Vo(e){let t=new URLSearchParams(e).get(`room`);return t?Bo(t):void 0}function Ho(e,t){return`${e}/?room=${t}`}var Uo={min:2,max:50},Wo=Uo.max-1,Go={spot:`pool`,conditions:{swell:`medium`,tide:`mid`,wind:`calm`,time:`midday`},cap:Uo.max};function Ko(e){return typeof e==`object`&&e&&!Array.isArray(e)?e:void 0}function qo(e){if(typeof e==`string`)return e.replace(/[\u0000-\u001f\u007f]/g,` `).replace(/\s+/g,` `).trim().slice(0,16).trim()||void 0}function Jo(e){try{let t=Ko(JSON.parse(e));return t&&typeof t.type==`string`?t:void 0}catch{return}}function Yo(e){return{body:e.body,outfit:e.outfit,color:e.color,board:e.board}}function Xo(e){return Kt(e,Ct)}var Zo=`breakline.settings.v1`;function Qo(e){let t=e=>Object.fromEntries(_a.map(t=>[t,[...e[t]]]));return{keyboard:t(e.keyboard),gamepad:t(e.gamepad)}}function $o(e=!1){return{gameplay:{units:`metric`,surfScale:`face`,defaultCamera:`front`,touchControls:`auto`,balanceMeter:`practice`,breathMeter:`practice`,pocketReflex:`practice`,stance:`regular`,scoreRides:!1,showTelemetry:!1,nameTags:!0,stanceReadout:!0},graphics:{preset:`auto`,...Eo.medium},controls:{bindings:Qo(xa),handedness:`right`,...za,padLayout:2},audio:{master:1,sea:1,board:1,ui:1,muteInBackground:!0},accessibility:{reducedMotion:e,uiScale:1,highContrastHud:!1,monoAudio:!1},surfer:{...Ct},seen:{rideHints:!1,lowPerformanceNotice:!1,steamController:!1},online:{name:``,tokens:{}}}}function es(e){return typeof e==`object`&&e&&!Array.isArray(e)?e:{}}function ts(e,t,n){return t.includes(e)?e:n}function ns(e,t){return typeof e==`boolean`?e:t}function rs(e,t,n,r){return typeof e==`number`&&Number.isFinite(e)&&e>=t&&e<=n?e:r}var is={hand:[2],popUp:[0],callParty:[4]};function as(e,t,n){let r=es(e),i=es(r.keyboard),a=es(r.gamepad),o=e=>Array.isArray(e)&&e.length>=1&&e.length<=2&&e.every(e=>typeof e==`string`&&e.length>0),s=e=>Array.isArray(e)&&e.length>=1&&e.length<=2&&e.every(e=>Number.isInteger(e)&&e>=0&&e<=21),c=Qo(t),l=[];for(let e of _a)e!==`pause`&&(o(i[e])?c.keyboard[e]=[...i[e]]:l.push({device:`keyboard`,action:e}),s(a[e])?c.gamepad[e]=[...a[e]]:l.push({device:`gamepad`,action:e}));if(n){let e=Object.entries(is).filter(([e,t])=>c.gamepad[e].join()===t.join()).map(([e])=>e),n={...c.gamepad};for(let r of e)n[r]=[...t.gamepad[r]];e.some(e=>n[e].some(t=>_a.some(r=>r!==e&&n[r].includes(t))))||(c.gamepad=n)}for(let{device:e,action:t}of l){let n=ka(c,e,t);e===`keyboard`?c.keyboard[t]=n:c.gamepad[t]=n}return c}function os(e){let t=es(e);if([`low`,`medium`,`high`,`ultra`].includes(t.preset)&&[`fast`,`accurate`].includes(t.water)&&typeof t.lowPerformance==`boolean`&&typeof t.adapter==`string`)return{preset:t.preset,water:t.water,lowPerformance:t.lowPerformance,adapter:t.adapter}}function ss(e,t){let n=es(e),r=es(n.gameplay),i=es(n.graphics),a=es(n.controls),o=es(n.accessibility),s=es(n.audio),c=es(n.seen),l=t.graphics,u=os(n.detected),d=ts(i.preset,[`auto`,`low`,`medium`,`high`,`ultra`,`custom`],l.preset),f=d!==`custom`&&i.frameLimit===`screen`?60:ts(i.frameLimit,[`screen`,60,30],l.frameLimit),p=d===`custom`?u?.preset===`low`?Eo.low.waterLook:l.waterLook:Eo[d===`auto`?u?.preset??`medium`:d].waterLook,m=d===`custom`?u?.preset===`low`?Eo.low.particles:l.particles:Eo[d===`auto`?u?.preset??`medium`:d].particles;return{gameplay:{units:ts(r.units,[`metric`,`imperial`],t.gameplay.units),surfScale:ts(r.surfScale,[`face`,`hawaiian`],t.gameplay.surfScale),defaultCamera:ts(r.defaultCamera,[`front`,`behind`,`side`,`overview`],t.gameplay.defaultCamera),touchControls:ts(r.touchControls,[`auto`,`on`,`off`],t.gameplay.touchControls),balanceMeter:ts(r.balanceMeter,[`practice`,`always`,`never`],t.gameplay.balanceMeter),breathMeter:ts(r.breathMeter,[`practice`,`always`,`never`],t.gameplay.breathMeter),pocketReflex:ts(r.pocketReflex,[`practice`,`always`,`never`],t.gameplay.pocketReflex),stance:ts(r.stance,[`regular`,`goofy`],t.gameplay.stance),scoreRides:ns(r.scoreRides,t.gameplay.scoreRides),showTelemetry:ns(r.showTelemetry,t.gameplay.showTelemetry),nameTags:ns(r.nameTags,t.gameplay.nameTags),stanceReadout:ns(r.stanceReadout,t.gameplay.stanceReadout)},graphics:{preset:d,renderScale:rs(i.renderScale,.5,1.25,l.renderScale),nativePixelDensity:ns(i.nativePixelDensity,l.nativePixelDensity),frameLimit:f,waterSimulation:ts(i.waterSimulation,[`auto`,`fast`,`accurate`],l.waterSimulation),seaDetail:ts(i.seaDetail,[`standard`,`rich`],l.seaDetail),caustics:ns(i.caustics,l.caustics),sprayMist:ns(i.sprayMist,l.sprayMist),oceanView:ts(i.oceanView,[`near`,`far`],l.oceanView),foam:ts(i.foam,[`simple`,`detailed`],l.foam),waterLook:ts(i.waterLook,[`classic`,`rich`],p),particles:ts(i.particles,y,m)},controls:{bindings:as(a.bindings,t.controls.bindings,a.padLayout!==2),handedness:ts(a.handedness,[`right`,`left`],t.controls.handedness),trimStick:ts(a.trimStick,[`right`,`left`],t.controls.trimStick),stickResponse:ts(a.stickResponse,[`linear`,`precise`],t.controls.stickResponse),deadzoneSteam:rs(a.deadzoneSteam,0,Ba,t.controls.deadzoneSteam),deadzoneGamepad:rs(a.deadzoneGamepad,0,Ba,t.controls.deadzoneGamepad),padLayout:2},audio:{master:rs(s.master,0,1,t.audio.master),sea:rs(s.sea,0,1,t.audio.sea),board:rs(s.board,0,1,t.audio.board),ui:rs(s.ui,0,1,t.audio.ui),muteInBackground:ns(s.muteInBackground,t.audio.muteInBackground)},accessibility:{reducedMotion:ns(o.reducedMotion,t.accessibility.reducedMotion),uiScale:rs(o.uiScale,.9,1.5,t.accessibility.uiScale),highContrastHud:ns(o.highContrastHud,t.accessibility.highContrastHud),monoAudio:ns(o.monoAudio,t.accessibility.monoAudio)},surfer:Kt(n.surfer,t.surfer),...u?{detected:u}:{},seen:{rideHints:ns(c.rideHints,t.seen.rideHints),lowPerformanceNotice:ns(c.lowPerformanceNotice,t.seen.lowPerformanceNotice),steamController:ns(c.steamController,t.seen.steamController)},online:cs(n.online,t.online)}}function cs(e,t){let n=es(e),r=Object.entries(es(n.tokens)).filter(([e,t])=>Bo(e)===e&&typeof t==`string`&&/^[0-9a-f]{32}$/.test(t)).slice(-10);return{name:qo(n.name)??t.name,tokens:Object.fromEntries(r)}}var ls=class{storage;defaults;current;listeners=new Set;constructor(e,t=$o()){this.storage=e,this.defaults=t;let n;try{n=JSON.parse(e?.getItem(`breakline.settings.v1`)??`null`)}catch{n=null}this.current=ss(n,t)}get value(){return this.current}update(e,t){this.commit({...this.current,[e]:{...this.current[e],...t}},e)}resetTab(e){this.commit({...this.current,[e]:this.defaults[e]},e)}setOnlineName(e){this.commit({...this.current,online:{...this.current.online,name:qo(e)??``}},`online`)}rememberRoom(e,t){let{[e]:n,...r}=this.current.online.tokens,i=Object.fromEntries([...Object.entries(r),[e,t]].slice(-10));this.commit({...this.current,online:{...this.current.online,tokens:i}},`online`)}setSurfer(e){this.commit({...this.current,surfer:{...this.current.surfer,...e}},`surfer`)}setDetected(e){let{detected:t,...n}=this.current;this.commit(e?{...n,detected:e}:n,`detected`)}markSeen(e){this.commit({...this.current,seen:{...this.current.seen,[e]:!0}},`seen`)}subscribe(e){return this.listeners.add(e),()=>{this.listeners.delete(e)}}commit(e,t){this.current=ss(e,this.defaults);try{this.storage?.setItem(Zo,JSON.stringify(this.current))}catch{}for(let e of this.listeners)e(this.current,t)}},us=.4;function ds(e,t){return Math.max(0,e)*(Number.isFinite(t)?Math.min(1,Math.max(us,t)):1)}var fs=class{step;behindFor=0;caughtUp=!1;constructor(e=x){this.step=e}reset(){this.behindFor=0,this.caughtUp=!1}next(e,t,n,r){let i=Math.floor((e-t)/this.step+1e-6)-n,a=Math.max(0,Math.min(90,i)),o=e-t;return!this.caughtUp&&o<=1&&(this.caughtUp=!0),this.behindFor=this.caughtUp&&o>1?this.behindFor+r:0,{steps:a,resync:this.caughtUp?o>5||this.behindFor>=3:o>30,caughtUp:this.caughtUp}}},ps=class{weight=0;x=0;z=0;jx=0;jz=0;accumulate(e){let t=Math.hypot(e[2],e[3]);t>0&&(this.weight+=t,this.x+=e[0]*t,this.z+=e[1]*t,this.jx+=e[2],this.jz+=e[3])}write(e,t,n,r,i){let{board:a,rider:o}=e;i.step=Math.round(n/x),i.boardPresent=a[7]>0,i.x=a[0],i.z=a[2],i.lift=i.boardPresent?a[1]-t(a[0],a[2]):0,i.qx=a[3],i.qy=a[4],i.qz=a[5],i.qw=a[6],i.present=o[z.present]>0;for(let e=0;e<21;e+=1)i.points[e]=i.present?o[z.points+e]-a[e%3]:0;i.phase=i.present?Math.round(o[z.phase]):-1,i.heading=i.present?o[z.heading]:0,i.paddling=r,i.leashSnapped=i.present&&((o[z.leash]??0)&w.snapped)!==0,i.ducking=i.present&&(o[z.duck]??0)>=.3,i.diving=i.present&&((o[z.swim]??0)&te.diving)!==0;let{weight:s}=this;return i.reaction.x=s>0?this.x/s:0,i.reaction.z=s>0?this.z/s:0,i.reaction.jx=this.jx,i.reaction.jz=this.jz,this.weight=this.x=this.z=this.jx=this.jz=0,i}},ms=8;function hs(e,t,n){let r=new Uint8Array(ms+t.byteLength),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint8(1,+!!n),i.setUint32(4,e,!0),r.set(t,ms),r}function gs(e){if(!(e.byteLength<=ms||e.byteLength===76||e[0]!==2))return{request:new DataView(e.buffer,e.byteOffset,e.byteLength).getUint32(4,!0),deflated:(e[1]&1)==1,bytes:e.subarray(ms)}}var _s=4,vs=78,ys=1,bs=2,xs=4,Ss=8,Cs=16,ws=32,Ts=64,Es=32.767,Ds=255;function Os(){return{step:0,x:0,z:0,lift:0,qx:0,qy:0,qz:0,qw:1,points:new Float32Array(21),phase:-1,present:!1,boardPresent:!1,paddling:!1,leashSnapped:!1,ducking:!1,diving:!1,heading:0,reaction:{x:0,z:0,jx:0,jz:0}}}function ks(e){return Number.isFinite(e)?Math.max(-32768,Math.min(32767,Math.round(e))):0}function As(e,t,n){t.setUint32(n,Math.max(0,Math.min(4294967295,Math.round(e.step))),!0),t.setInt16(n+4,ks(e.x*100),!0),t.setInt16(n+6,ks(e.z*100),!0),t.setInt16(n+8,ks(e.lift*1e3),!0);let r=Math.hypot(e.qx,e.qy,e.qz,e.qw)||1;t.setInt16(n+10,ks(e.qx/r*32767),!0),t.setInt16(n+12,ks(e.qy/r*32767),!0),t.setInt16(n+14,ks(e.qz/r*32767),!0),t.setInt16(n+16,ks(e.qw/r*32767),!0);let i=e.points.every(e=>Math.abs(e)<=Es),a=i?1e3:100;for(let r=0;r<21;r+=1)t.setInt16(n+18+r*2,ks(e.points[r]*a),!0);t.setUint8(n+60,e.phase>=0&&e.phase<Ds?Math.round(e.phase):Ds),t.setUint8(n+61,(e.present?ys:0)|(e.boardPresent?bs:0)|(e.paddling?xs:0)|(e.leashSnapped?Ss:0)|(e.ducking?Cs:0)|(e.diving?ws:0)|(i?Ts:0)),t.setInt16(n+62,ks(e.heading*1e4),!0),t.setInt16(n+64,ks(e.reaction.x*100),!0),t.setInt16(n+66,ks(e.reaction.z*100),!0),t.setFloat32(n+68,Number.isFinite(e.reaction.jx)?e.reaction.jx:0,!0),t.setFloat32(n+72,Number.isFinite(e.reaction.jz)?e.reaction.jz:0,!0)}function js(e,t,n){n.step=e.getUint32(t,!0),n.x=e.getInt16(t+4,!0)/100,n.z=e.getInt16(t+6,!0)/100,n.lift=e.getInt16(t+8,!0)/1e3,n.qx=e.getInt16(t+10,!0)/32767,n.qy=e.getInt16(t+12,!0)/32767,n.qz=e.getInt16(t+14,!0)/32767,n.qw=e.getInt16(t+16,!0)/32767;let r=e.getUint8(t+60);n.phase=r===Ds?-1:r;let i=e.getUint8(t+61),a=(i&Ts)===0?100:1e3;for(let r=0;r<21;r+=1)n.points[r]=e.getInt16(t+18+r*2,!0)/a;return n.present=(i&ys)!==0,n.boardPresent=(i&bs)!==0,n.paddling=(i&xs)!==0,n.leashSnapped=(i&Ss)!==0,n.ducking=(i&Cs)!==0,n.diving=(i&ws)!==0,n.heading=e.getInt16(t+62,!0)/1e4,n.reaction.x=e.getInt16(t+64,!0)/100,n.reaction.z=e.getInt16(t+66,!0)/100,n.reaction.jx=e.getFloat32(t+68,!0),n.reaction.jz=e.getFloat32(t+72,!0),n}function Ms(e,t){if(e.byteLength<_s)return 0;let n=new DataView(e),r=n.getUint16(2,!0);if(n.getUint8(0)!==1||e.byteLength!==_s+r*vs)return 0;for(let e=0;e<r;e+=1){let r=_s+e*vs;t(n.getUint16(r,!0),n,r+2)}return r}var Ns={near:6,far:30},Ps=30,Fs=10,Is={along:3,out:4},Ls=5,Rs=12;function zs(e,t,n=Math.random){let r=new Set;for(let t=e.focusX-Ps;t<=e.focusX+Ps+1e-9;t+=Is.along)r.add(Math.max(e.xMin+Fs,Math.min(e.xMax-Fs,t)));let i=[];for(let n of r)for(let r=Ns.near;r<=Ns.far+1e-9;r+=Is.out){let a=e.focusZ-r,o=Rs;for(let e of t)o=Math.min(o,Math.hypot(n-e.x,a-e.z));i.push({x:n,z:a,clearance:o,distance:Math.hypot(n-e.focusX,r-Ns.near)})}let a=i.filter(e=>e.clearance>=3).sort((e,t)=>e.distance-t.distance);if(a.length){let e=a[Math.min(a.length-1,Math.floor(n()*Math.min(Ls,a.length)))];return{x:e.x,z:e.z}}let o=i.reduce((e,t)=>t.clearance>e.clearance?t:e);return{x:o.x,z:o.z}}var Bs={paddle:!1,popUp:!1,steer:0},Vs=class{link;now;phase=`catching-up`;behind=0;pacer=new fs;own=new ps;pose=Os();lastSeaTime=NaN;sendClock=0;respawnAt;constructor(e,t=()=>performance.now()){this.link=e,this.now=t}step(e,t,n){let r=e.host;if(!r||!this.link.clockReady)return e.advance(0),{resync:!1};let i=r.snapshot.status.seaTime;i!==this.lastSeaTime&&(this.own.accumulate(r.snapshot.reaction),this.lastSeaTime=i);let a=this.link.seaTimeNow();this.behind=a-i;let{steps:o,resync:s,caughtUp:c}=this.pacer.next(a,i,r.outstandingSteps,t);if(s)return this.phase=`resyncing`,{resync:!0};c&&this.phase===`catching-up`&&(this.phase=`riding`,e.retry(this.freeSpot(r))),this.respawnAt!==void 0&&this.now()>=this.respawnAt&&(this.respawnAt=void 0,e.retry(this.freeSpot(r)));let l=this.phase===`riding`;if(e.advance(o,l?n??Bs:Bs,this.link.takeReactions()),!l)return{resync:!1};this.sendClock+=t;let u=1/20;return this.sendClock+1e-9>=u&&(this.sendClock=Math.min(u,this.sendClock-u),this.link.sendPose(this.own.write(r.snapshot,(e,t)=>r.heightAt(e,t),i,l&&(n?.paddle??!1),this.pose))),{resync:!1}}freeSpot(e){let{init:t}=e;return zs({focusX:t.focus.x,focusZ:t.focus.z,xMin:t.windowXMin,xMax:t.windowXMin+(t.grid.nx-1)*t.grid.spacing},this.link.remote.latestPositions())}respawn(){this.phase===`riding`&&this.respawnAt===void 0&&(this.respawnAt=this.now()+3e3)}get respawnIn(){return this.respawnAt===void 0?void 0:Math.max(0,(this.respawnAt-this.now())/1e3)}restart(){this.pacer.reset(),this.phase=`catching-up`,this.lastSeaTime=NaN,this.sendClock=0,this.respawnAt=void 0}},Hs=.1,Us=.25,Ws=8,Gs=2,Ks=3,qs=Ce.indexOf(`fallen`);function Js(){return{x:0,z:0,lift:0,quaternion:[0,0,0,1],points:new Float32Array(21),phase:-1,present:!1,boardPresent:!1,paddling:!1,leashSnapped:!1,ducking:!1,diving:!1,heading:0}}function Ys(e){return Math.atan2(Math.sin(e),Math.cos(e))}function Xs(e,t){return e.present===t.present&&e.boardPresent===t.boardPresent&&Math.hypot(t.x-e.x,t.z-e.z)<=Gs*(t.step-e.step)}function Zs(e,t){let n=e[t],r=e[t+1];return n!==void 0&&r!==void 0&&Xs(n,r)&&n.phase===r.phase}function Qs(e,t,n,r){let i=(e[t+1].step-e[t].step)*x,a=(e[n+1].step-e[n].step)*x,o=0;for(let s=3*r;s<3*r+3;s+=1){let r=(e[t+1].points[s]-e[t].points[s])/i,c=(e[n+1].points[s]-e[n].points[s])/a;o+=(r-c)**2}return Math.sqrt(o)}function $s(e,t,n){if(e[t].phase===qs)return!1;let r=!1;for(let i of[t-1,t+1])if(Zs(e,i)&&(r=!0,Qs(e,t,i,n)<=Ks))return!1;return r}function ec(e,t,n,r,i){if(!(r>0))return(n-t)/i;if(!(i>0))return(t-e)/r;let a=(t-e)/r,o=(n-t)/i;if(a*o<=0)return 0;let s=(a*i+o*r)/(r+i);return Math.sign(s)*Math.min(2*Math.abs(a),2*Math.abs(o),Math.abs(s))}function tc(e,t){t.x=e.x,t.z=e.z,t.lift=e.lift,t.quaternion[0]=e.qx,t.quaternion[1]=e.qy,t.quaternion[2]=e.qz,t.quaternion[3]=e.qw,t.points.set(e.points),t.phase=e.phase,t.present=e.present,t.boardPresent=e.boardPresent,t.paddling=e.paddling,t.leashSnapped=e.leashSnapped,t.ducking=e.ducking,t.diving=e.diving,t.heading=e.heading}var nc=class{remotes=new Map;join(e){this.remotes.set(e.id,{info:e,poses:[],heardAt:-1/0})}leave(e){this.remotes.delete(e)}ids(){return[...this.remotes.keys()]}info(e){return this.remotes.get(e)?.info}receiveBundle(e,t,n){Ms(e,(e,r,i)=>{let a=this.remotes.get(e);if(!a)return;let o=a.poses.at(-1);if(o&&r.getUint32(i,!0)<=o.step)return;let s=js(r,i,a.poses.length>=Ws?a.poses.shift():Os());a.poses.push(s),a.heardAt=t;let{reaction:c}=s;(c.jx!==0||c.jz!==0)&&n.push(c.x,c.z,c.jx,c.jz)})}prune(e){let t=[];for(let[n,r]of this.remotes)r.poses.length&&e-r.heardAt>5e3&&(r.poses.length=0,t.push(n));return t}sample(e,t,n){let r=this.remotes.get(e)?.poses;if(!r?.length)return!1;let i=t/x,a=r[0],o=r[r.length-1];if(i<=a.step)return tc(a,n),!0;if(i>=o.step){tc(o,n);let e=r[r.length-2];if(e&&Xs(e,o)){let t=Math.min(i-o.step,Us/x),r=o.step-e.step;n.x+=(o.x-e.x)/r*t,n.z+=(o.z-e.z)/r*t}return!0}let s=0;for(;r[s+1].step<=i;)s+=1;let c=r[s],l=r[s+1];if(!Xs(c,l))return tc(l,n),!0;let u=l.step-c.step,d=(i-c.step)/u;if(tc(d<.5?c:l,n),n.x=c.x+(l.x-c.x)*d,n.z=c.z+(l.z-c.z)*d,n.lift=c.lift+(l.lift-c.lift)*d,c.phase===l.phase){let e=r[s-1],t=r[s+2],i=Zs(r,s-1)?c.step-e.step:0,a=Zs(r,s+1)?t.step-l.step:0,o=d*d,f=o*d,p=2*f-3*o+1,m=1-p,h=(f-2*o+d)*u,g=(f-o)*u;for(let o=0;o<7;o+=1){if($s(r,s,o))continue;let d=i&&!$s(r,s-1,o)?i:0,f=a&&!$s(r,s+1,o)?a:0;for(let r=3*o;r<3*o+3;r+=1){let i=c.points[r],a=l.points[r],o=ec(d?e.points[r]:i,i,a,d,u),s=ec(i,a,f?t.points[r]:a,u,f);n.points[r]=p*i+m*a+h*o+g*s}}}n.heading=c.heading+Ys(l.heading-c.heading)*d;let f=c.qx*l.qx+c.qy*l.qy+c.qz*l.qz+c.qw*l.qw<0?-1:1,p=n.quaternion;p[0]=c.qx+(f*l.qx-c.qx)*d,p[1]=c.qy+(f*l.qy-c.qy)*d,p[2]=c.qz+(f*l.qz-c.qz)*d,p[3]=c.qw+(f*l.qw-c.qw)*d;let m=Math.hypot(p[0],p[1],p[2],p[3])||1;for(let e=0;e<4;e+=1)p[e]/=m;return!0}latestPositions(){let e=[];for(let t of this.remotes.values()){let n=t.poses.at(-1);n&&e.push({x:n.x,z:n.z})}return e}},rc=ot(),ic=(()=>{let e=-rc.length/2+.05,t=rc.centerOfMass;return new R(-t.x,xt(rc,e)-t.y,e-t.z)})(),ac=new p,oc=new R;function sc(e,t,n){n[0]=e.x,n[1]=t(e.x,e.z)+e.lift,n[2]=e.z;for(let t=0;t<4;t+=1)n[3+t]=e.quaternion[t];return n[7]=1,n}function cc(e,t,n,r){for(let r=0;r<21;r+=1)n[z.points+r]=t[r%3]+e.points[r];n[z.phase]=e.phase,n[z.present]=1,n[z.heading]=e.heading;let i=e.phase===Ce.indexOf(`fallen`);return n[z.duck]=+!!e.ducking,n[z.breath]=1,ac.set(t[3],t[4],t[5],t[6]),oc.copy(ic).applyQuaternion(ac),oc.x+=t[0],oc.y+=t[1],oc.z+=t[2],oc.toArray(n,z.plug),n[z.leash]=e.leashSnapped?w.snapped:w.worn,n[z.swim]=i?e.diving?te.diving:e.paddling?te.stroking:0:0,Ee(n,t,r),r.stroking=e.paddling&&r.phase===`prone`?1:0,r}var lc=.45,uc=1.2;function dc(e,t){e.traverse(e=>{if(e instanceof tt){t&&e.geometry.dispose();for(let t of[].concat(e.material))t.dispose()}})}var fc=class{root=new at;views=new Map;shape=rc;detail;constructor(e){this.root.name=`remote-surfers`,e.add(this.root)}sync(e){let t=new Set(e.map(e=>e.id));for(let[e,n]of this.views)t.has(e)||this.remove(e,n);for(let{id:t,look:n}of e){let e=JSON.stringify(n),r=this.views.get(t);r?.look!==e&&(r&&this.remove(t,r),this.views.set(t,this.create(n,e)))}}create(e,t){let n=Xo(e),r=L.find(e=>e.id===n.board)??L[0],i=Ot(this.shape,r),o=new M;this.detail&&o.setDetail(this.detail.lodDistance,this.detail.textureCap),o.dress(Re(n),{accent:new N(rt[n.color])}),o.load(n.body);let s=new b,c=new at;c.add(i,o.group,s.object),c.visible=!1,this.root.add(c);let l=new Float64Array(8);return l[7]=1,{group:c,board:i,surfer:o,leash:s,look:t,state:a(),motion:new D,rider:new Float64Array(z.length),pose:l,shown:!1}}remove(e,t){this.root.remove(t.group),dc(t.board,!0),dc(t.surfer.group,!1),this.views.delete(e)}update(e,t,n,r,i=NaN){let a=this.views.get(e);if(!a)return;if(a.shown=!!t?.boardPresent,a.group.visible=a.shown,!t||!a.shown){a.motion.reset();return}let{pose:o,rider:s}=a;if(sc(t,n,o),a.board.position.set(o[0],o[1],o[2]),a.board.quaternion.set(o[3],o[4],o[5],o[6]),a.surfer.group.visible=t.present,a.leash.object.visible=t.present,!t.present){a.motion.reset();return}cc(t,o,s,a.state),a.motion.update(a.state,i),a.state.clock=performance.now()/1e3,a.surfer.update(a.state,r),a.leash.update(a.state.points[Xt.rightFoot],a.state.leash.plug,{snapped:a.state.leash.snapped})}riderStateOf(e){return this.views.get(e)?.state}tagAnchor(e,t){let n=this.views.get(e);return n?.shown?(n.surfer.group.visible?(t.copy(n.state.points[Xt.head]),t.y+=lc):(t.copy(n.board.position),t.y+=uc),!0):!1}setDetail(e,t){this.detail={lodDistance:e,textureCap:t};for(let n of this.views.values())n.surfer.setDetail(e,t)}setVisible(e){this.root.visible=e}boardOf(e){return this.views.get(e)?.board}surferOf(e){return this.views.get(e)?.surfer}dispose(){for(let[e,t]of this.views)this.remove(e,t);this.root.removeFromParent()}};function Q(e,t={},...n){let r=document.createElement(e);t.class&&(r.className=t.class),t.text!==void 0&&(r.textContent=t.text);for(let[e,n]of Object.entries(t.attrs??{}))r.setAttribute(e,n);Object.assign(r.dataset,t.dataset??{});for(let[e,n]of Object.entries(t.on??{}))r.addEventListener(e,n);for(let e of n)e&&r.append(e);return r}function pc(e){let t=document.createElement(`template`);return t.innerHTML=e.trim(),t.content.firstElementChild}var mc=new R,hc=new R;function gc(e,t,n,r,i){let a=t.getWorldPosition(hc);return e.map(e=>{mc.copy(e.world).project(t);let o=mc.z>-1&&mc.z<1&&Math.abs(mc.x)<=1.2&&Math.abs(mc.y)<=1.2,s=e.world.distanceTo(a)<=150,c=i&&e.name.length>0;return{id:e.id,name:e.name,call:e.call,x:(mc.x*.5+.5)*n,y:(-mc.y*.5+.5)*r,visible:o&&s&&(c||e.call!==void 0),showName:c}})}var _c=class{root=Q(`div`,{class:`name-tags`,attrs:{"aria-hidden":`true`}});pool=[];constructor(e){e.append(this.root)}update(e,t,n,r,i){let a=gc(e,t,n,r,i);for(;this.pool.length<a.length;){let e=Q(`span`,{class:`name-tag__name`}),t=Q(`span`,{class:`name-tag__call`}),n=Q(`div`,{class:`name-tag`},t,e);this.root.append(n),this.pool.push({root:n,name:e,call:t})}this.pool.forEach((e,t)=>{let n=a[t];if(!n?.visible){e.root.hidden=!0;return}e.root.hidden=!1,e.root.style.transform=`translate(${n.x.toFixed(1)}px, ${n.y.toFixed(1)}px) translate(-50%, -100%)`,e.name.textContent!==n.name&&(e.name.textContent=n.name),e.name.hidden=!n.showName,e.call.hidden=n.call===void 0,n.call!==void 0&&e.call.textContent!==n.call&&(e.call.textContent=n.call)})}dispose(){this.root.remove()}},vc=1e-8,yc=1e-9,bc=class{position=new R;quaternion=new p;drawnAt=-1/0;needsDraw(e,t,n){return n||t-this.drawnAt>=500||e.position.distanceToSquared(this.position)>vc||1-Math.abs(e.quaternion.dot(this.quaternion))>yc}drawn(e,t){this.position.copy(e.position),this.quaternion.copy(e.quaternion),this.drawnAt=t}reset(){this.drawnAt=-1/0}},xc=class{group=new at;sun;sky;skyMaterial;constructor(){this.skyMaterial=new Vt({side:1,depthWrite:!1,uniforms:{uHorizon:{value:new N(`#fcb993`)},uZenith:{value:new N(`#83c7d1`)}},vertexShader:`
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        varying vec3 vDirection;
        uniform vec3 uHorizon;
        uniform vec3 uZenith;
        void main() {
          float altitude = clamp(vDirection.y * 1.7 + 0.12, 0.0, 1.0);
          vec3 color = mix(uHorizon, uZenith, smoothstep(0.0, 1.0, altitude));
          gl_FragColor = vec4(color, 1.0);
        }
      `}),this.sky=new tt(new v(150,32,16),this.skyMaterial),this.sky.renderOrder=-10,this.group.add(this.sky),this.sun=new tt(new v(4,24,16),new Qe({color:`#fff1c9`,fog:!1})),this.group.add(this.sun),this.setSunPosition(.35,-25)}setSunPosition(e,t){let n=Math.max(0,Math.min(1,e)),r=t*Math.PI/180;this.sun.position.set(Math.sin(r)*120,8+n*35,-Math.cos(r)*120),this.skyMaterial.uniforms.uHorizon.value.set(`#fcb993`).lerp(new N(`#d6dfe0`),n*.55),this.skyMaterial.uniforms.uZenith.value.set(`#83c7d1`).lerp(new N(`#aad5e0`),n*.45)}get sunPosition(){return this.sun.position}showSky(e){this.sky.visible=e,this.sun.visible=e}get sunMesh(){return this.sun}},Sc=class extends C{constructor(e){super(e),this.type=Fe}parse(e){let t=function(e,t){switch(e){case 1:throw Error(`THREE.HDRLoader: Read Error: `+(t||``));case 2:throw Error(`THREE.HDRLoader: Write Error: `+(t||``));case 3:throw Error(`THREE.HDRLoader: Bad File Format: `+(t||``));default:case 4:throw Error(`THREE.HDRLoader: Memory Error: `+(t||``))}},n=function(e,t,n){t||=1024;let r=e.pos,i=-1,a=0,o=``,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(i=s.indexOf(`
`))&&a<t&&r<e.byteLength;)o+=s,a+=s.length,r+=128,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return-1<i&&(!1!==n&&(e.pos+=a+i+1),o+s.slice(0,i))},r=function(e){let r=/^#\?(\S+)/,i=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,a=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,o=/^\s*FORMAT=(\S+)\s*$/,s=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,c={valid:0,string:``,comments:``,programtype:`RGBE`,format:``,gamma:1,exposure:1,width:0,height:0},l,u;for((e.pos>=e.byteLength||!(l=n(e)))&&t(1,`no header found`),(u=l.match(r))||t(3,`bad initial token`),c.valid|=1,c.programtype=u[1],c.string+=l+`
`;l=n(e),!1!==l;){if(c.string+=l+`
`,l.charAt(0)===`#`){c.comments+=l+`
`;continue}if((u=l.match(i))&&(c.gamma=parseFloat(u[1])),(u=l.match(a))&&(c.exposure=parseFloat(u[1])),(u=l.match(o))&&(c.valid|=2,c.format=u[1]),(u=l.match(s))&&(c.valid|=4,c.height=parseInt(u[1],10),c.width=parseInt(u[2],10)),c.valid&2&&c.valid&4)break}return c.valid&2||t(3,`missing format specifier`),c.valid&4||t(3,`missing image size specifier`),c},i=function(e,n,r){let i=n;if(i<8||i>32767||e[0]!==2||e[1]!==2||e[2]&128)return new Uint8Array(e);i!==(e[2]<<8|e[3])&&t(3,`wrong scanline width`);let a=new Uint8Array(4*n*r);a.length||t(4,`unable to allocate buffer space`);let o=0,s=0,c=4*i,l=new Uint8Array(4),u=new Uint8Array(c),d=r;for(;d>0&&s<e.byteLength;){s+4>e.byteLength&&t(1),l[0]=e[s++],l[1]=e[s++],l[2]=e[s++],l[3]=e[s++],(l[0]!=2||l[1]!=2||(l[2]<<8|l[3])!=i)&&t(3,`bad rgbe scanline format`);let n=0,r;for(;n<c&&s<e.byteLength;){r=e[s++];let i=r>128;if(i&&(r-=128),(r===0||n+r>c)&&t(3,`bad scanline data`),i){let t=e[s++];for(let e=0;e<r;e++)u[n++]=t}else u.set(e.subarray(s,s+r),n),n+=r,s+=r}let f=i;for(let e=0;e<f;e++){let t=0;a[o]=u[e+t],t+=i,a[o+1]=u[e+t],t+=i,a[o+2]=u[e+t],t+=i,a[o+3]=u[e+t],o+=4}d--}return a},a=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=e[t+0]*i,n[r+1]=e[t+1]*i,n[r+2]=e[t+2]*i,n[r+3]=1},o=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=ne.toHalfFloat(Math.min(e[t+0]*i,65504)),n[r+1]=ne.toHalfFloat(Math.min(e[t+1]*i,65504)),n[r+2]=ne.toHalfFloat(Math.min(e[t+2]*i,65504)),n[r+3]=ne.toHalfFloat(1)},s=new Uint8Array(e);s.pos=0;let c=r(s),l=c.width,u=c.height,d=i(s.subarray(s.pos),l,u),f,p,m;switch(this.type){case Ke:m=d.length/4;let e=new Float32Array(m*4);for(let t=0;t<m;t++)a(d,t*4,e,t*4);f=e,p=Ke;break;case Fe:m=d.length/4;let t=new Uint16Array(m*4);for(let e=0;e<m;e++)o(d,e*4,t,e*4);f=t,p=Fe;break;default:throw Error(`THREE.HDRLoader: Unsupported type: `+this.type)}return{width:l,height:u,data:f,header:c.string,gamma:c.gamma,exposure:c.exposure,type:p,colorSpace:He,minFilter:Be,magFilter:Be,generateMipmaps:!1,flipY:!0}}setDataType(e){return this.type=e,this}};function Cc(e){return 60*Math.min(1,Math.max(0,e))}var wc=e=>Math.asin(e.sun.direction[1])*180/Math.PI;function Tc(e,t){return e.reduce((e,n)=>Math.abs(wc(n)-t)<Math.abs(wc(e)-t)?n:e)}function Ec(e,t){let n=t*Math.PI/180;return Math.atan2(Math.sin(n),-Math.cos(n))-Math.atan2(e[0],e[2])}function Dc(e,t,n){let r=Math.cos(t),i=Math.sin(t);return n.set(e[0]*r+e[2]*i,e[1],-e[0]*i+e[2]*r).normalize()}var Oc=3.2;function kc(e){let[t,n,r]=e.sun.irradiance,i=Math.max(0,e.sun.direction[1]),a=e.skyIrradiance+(.2126*t+.7152*n+.0722*r)*i,o=Oc*(.4+.6*Math.sqrt(i))/Math.max(1e-6,a),s=Math.max(t,n,r);return{environment:o,sun:o*s,sunColor:s>0?new N(t/s,n/s,r/s):new N(1,1,1)}}function Ac(e,t){return{async manifest(){let e=await fetch(`${t}skies/skies.json`);if(!e.ok)throw Error(`sky manifest: ${e.status}`);return(await e.json()).skies},async sky(n){let[r,i]=await Promise.all([new Sc().loadAsync(`${t}${n.hdr}`),new ce().loadAsync(`${t}${n.background}`)]);r.mapping=303,i.mapping=303,i.colorSpace=Gt;let a=new Cn(e),o=a.fromEquirectangular(r);return a.dispose(),r.dispose(),{environment:o.texture,background:i,dispose:()=>{o.dispose(),i.dispose()}}}}}var jc=class{loads;sunDirection=new R(0,1,0);sunColor=new N(1,1,1);sunIntensity=0;environment;background;environmentIntensity=1;rotation=0;skies;current;loaded;request=0;constructor(e,t=`assets/`,n=Ac(e,t)){this.loads=n}get ready(){return this.environment!==void 0}get timeOfDay(){return this.current?.timeOfDay}async loadManifest(){return this.skies??=await this.loads.manifest(),this.skies}async select(e,t){let n=++this.request,r=Tc(await this.loadManifest(),e);if(n!==this.request)return!1;let i=r!==this.current;if(i){let e=await this.loads.sky(r);if(n!==this.request)return e.dispose(),!1;this.loaded?.dispose(),this.loaded=e,this.environment=e.environment,this.background=e.background,this.current=r;let t=kc(r);this.environmentIntensity=t.environment,this.sunIntensity=t.sun,this.sunColor.copy(t.sunColor)}return this.rotation=Ec(r.sun.direction,t),Dc(r.sun.direction,this.rotation,this.sunDirection),i}dispose(){this.request+=1,this.loaded?.dispose(),this.loaded=void 0,this.environment=void 0,this.background=void 0,this.current=void 0}applyTo(e,t){if(this.environment){e.environment=this.environment,e.environmentIntensity=this.environmentIntensity,e.environmentRotation.set(0,this.rotation,0),e.backgroundRotation.set(0,this.rotation,0);for(let e of t)e.envMap!==this.environment&&(e.needsUpdate=!0),e.envMap=this.environment,e.envMapIntensity=this.environmentIntensity,e.envMapRotation.set(0,this.rotation,0)}}},Mc=[`blob`,`rider`,`surfaces`,`soft`];function Nc(e,t=`surfaces`){let n=new URLSearchParams(e).get(`shadows`);return Mc.includes(n)?n:t}var Pc=1,Fc=45,Ic=20,Lc=.02;function Rc(e,t,n,r,i){let a=2*n/r;return i.copy(e).applyQuaternion(t.clone().invert()),i.x=Math.round(i.x/a)*a,i.y=Math.round(i.y/a)*a,i.applyQuaternion(t)}var zc=`float getShadow( sampler2D shadowMap`,Bc=`return mix( 1.0, shadow, shadowIntensity );`,Vc=`
	#define PCSS_SAMPLES 16
	vec2 pcssDisk( const in int i, const in float phi ) {
		float r = sqrt( ( float( i ) + 0.5 ) / float( PCSS_SAMPLES ) );
		float theta = float( i ) * 2.39996323 + phi;
		return vec2( cos( theta ), sin( theta ) ) * r;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		#ifdef USE_REVERSED_DEPTH_BUFFER
			shadowCoord.z -= shadowBias;
		#else
			shadowCoord.z += shadowBias;
		#endif
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		if ( inFrustum && shadowCoord.z <= 1.0 ) {
			float phi = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.28318530;
			float search = ${(Lc*4/8).toFixed(5)};
			float blockers = 0.0;
			float blockerDepth = 0.0;
			for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
				float depth = texture2D( shadowMap, shadowCoord.xy + pcssDisk( i, phi ) * search ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					bool blocks = depth > shadowCoord.z;
				#else
					bool blocks = depth < shadowCoord.z;
				#endif
				if ( blocks ) { blockerDepth += depth; blockers += 1.0; }
			}
			if ( blockers > 0.0 ) {
				// Orthographic depth is linear: the depth gap times the range is the caster-to-receiver distance, m.
				float gap = abs( shadowCoord.z - blockerDepth / blockers ) * ${44 .toFixed(1)};
				float penumbra = gap * ${(Lc/8).toFixed(6)} + 1.0 / shadowMapSize.x;
				float lit = 0.0;
				for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
					float depth = texture2D( shadowMap, shadowCoord.xy + pcssDisk( i, phi + 1.3 ) * penumbra ).r;
					#ifdef USE_REVERSED_DEPTH_BUFFER
						lit += step( depth, shadowCoord.z );
					#else
						lit += step( shadowCoord.z, depth );
					#endif
				}
				shadow = lit / float( PCSS_SAMPLES );
			}
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
`,Hc=X.shadowmap_pars_fragment;function Uc(e){if(!e)return X.shadowmap_pars_fragment=Hc,!0;let t=Hc.lastIndexOf(zc),n=t<0?-1:Hc.indexOf(Bc,t),r=n<0?-1:Hc.indexOf(`}`,n+43);return r<0?!1:(X.shadowmap_pars_fragment=Hc.slice(0,t)+Vc+Hc.slice(r+1),!0)}function Wc(e=64){let t=new Uint8Array(e*e*4);for(let n=0;n<e;n+=1)for(let r=0;r<e;r+=1){let i=(r+.5)/e*2-1,a=(n+.5)/e*2-1,o=Math.min(1,Math.hypot(i,a)),s=Math.round(255*(1-o*o)**2);t.set([s,s,s,255],(n*e+r)*4)}let n=new ke(t,e,e);return n.needsUpdate=!0,n}var Gc=class{renderer;light;scene;blob;level=`surfaces`;lightQuaternion=new p;snapped=new R;zAxis=new R(0,0,1);constructor(e,t,n){this.renderer=e,this.light=t,this.scene=n;let r=t.shadow.camera;r.left=-4,r.right=4,r.top=4,r.bottom=-4,r.near=Pc,r.far=Fc,r.updateProjectionMatrix(),t.shadow.bias=-4e-4,t.shadow.normalBias=.02,n.add(t.target),this.blob=new tt(new _(.9,2.2).rotateX(-Math.PI/2),new Qe({color:new N(0,0,0),alphaMap:Wc(),transparent:!0,opacity:.35,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2})),this.blob.renderOrder=1,this.blob.visible=!1,n.add(this.blob)}get currentLevel(){return this.level}setLevel(e,t){let n=e!==`blob`;this.renderer.shadowMap.enabled=n,this.renderer.shadowMap.type=e===`soft`?0:1,this.renderer.shadowMap.needsUpdate=!0,this.light.castShadow=n;let r=e===`rider`?1024:2048;this.light.shadow.mapSize.x!==r&&(this.light.shadow.mapSize.set(r,r),this.light.shadow.map?.dispose(),this.light.shadow.map=null),this.light.shadow.radius=e===`rider`?2:3,this.blob.visible=e===`blob`;for(let n of t.surfaces)n.receiveShadow=e===`surfaces`||e===`soft`;e!==this.level&&(e===`soft`||this.level===`soft`)&&!Uc(e===`soft`)&&console.warn(`PCSS could not patch three's shadow chunk; using hard shadows.`),this.level=e,this.scene.traverse(e=>{let t=e.material;for(let e of Array.isArray(t)?t:t?[t]:[])e.needsUpdate=!0})}follow(e,t,n,r=0){this.lightQuaternion.setFromUnitVectors(this.zAxis,t),Rc(e,this.lightQuaternion,4,this.light.shadow.mapSize.x,this.snapped),this.light.target.position.copy(this.snapped),this.light.position.copy(this.snapped).addScaledVector(t,Ic),this.light.target.updateMatrixWorld(),this.blob.position.set(e.x,n+.02,e.z),this.blob.rotation.y=r}},Kc=Math.sqrt(6*.075*.075/2),qc=6,Jc=.5;function Yc(e,t){return e<t/2?e:e-t}function Xc(e){let t=Math.max(1e-12,e()),n=e(),r=Math.sqrt(-2*Math.log(t));return[r*Math.cos(2*Math.PI*n),r*Math.sin(2*Math.PI*n)]}function Zc(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function Qc(e,t,n=256,r=64){let i=Zc(t*7919+17),a=Math.max(2,Math.abs(e)),o=e>=0?1:-1,s=a*a/It,c=Jc/(2*Math.PI),l=2*Math.PI/qc,u=new Float64Array(n*n*2);for(let e=0;e<n;e+=1)for(let t=0;t<n;t+=1){let a=2*Math.PI*Yc(t,n)/r,d=2*Math.PI*Yc(e,n)/r,f=Math.hypot(a,d),[p,m]=Xc(i);if(f===0)continue;let h=d/f*o,g=Math.exp(-1/(f*s)**2)/f**4*h*h*Math.exp(-((f*c)**2));h<0&&(g*=.07),g*=1-Math.exp(-((f/l)**4));let _=Math.sqrt(g/2);u[(e*n+t)*2]=p*_,u[(e*n+t)*2+1]=m*_}let d=0;for(let e=0;e<n;e+=1)for(let t=0;t<n;t+=1){let i=(2*Math.PI/r)**2*(Yc(t,n)**2+Yc(e,n)**2),a=(e*n+t)*2;d+=i*(u[a]**2+u[a+1]**2)*2}let f=d>0?Kc/Math.sqrt(d):0,p=new Float32Array(n*n*4);for(let e=0;e<n;e+=1)for(let t=0;t<n;t+=1){let r=(e*n+t)*2,i=((n-e)%n*n+(n-t)%n)*2,a=(e*n+t)*4;p[a]=u[r]*f,p[a+1]=u[r+1]*f,p[a+2]=u[i]*f,p[a+3]=-u[i+1]*f}return p}var $c=`
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`,el=`
uniform sampler2D spectrum;
uniform float size;
uniform float patchSize;
uniform float time;
varying vec2 vUv;
void main() {
  vec2 cell = floor( vUv * size );
  vec2 bin = vec2( cell.x < size * 0.5 ? cell.x : cell.x - size, cell.y < size * 0.5 ? cell.y : cell.y - size );
  vec2 wave = bin * 6.28318530718 / patchSize;
  float omega = sqrt( 9.81 * length( wave ) );
  vec4 h0 = texture2D( spectrum, ( cell + 0.5 ) / size );
  float c = cos( omega * time );
  float s = sin( omega * time );
  float hr = h0.x * c - h0.y * s + h0.z * c + h0.w * s;
  float hi = h0.x * s + h0.y * c - h0.z * s + h0.w * c;
  gl_FragColor = vec4( -wave.x * hi - wave.y * hr, wave.x * hr - wave.y * hi, 0.0, 1.0 );
}
`,tl=`
uniform sampler2D field;
uniform float size;
uniform float span;
uniform float alongRows;
varying vec2 vUv;
void main() {
  vec2 cell = floor( vUv * size );
  float o = alongRows > 0.5 ? cell.x : cell.y;
  float q = mod( o, 2.0 * span );
  float within = mod( q, span );
  float j = floor( o / ( 2.0 * span ) ) * span + within;
  vec2 aCell = alongRows > 0.5 ? vec2( j, cell.y ) : vec2( cell.x, j );
  vec2 bCell = alongRows > 0.5 ? vec2( j + size * 0.5, cell.y ) : vec2( cell.x, j + size * 0.5 );
  vec2 a = texture2D( field, ( aCell + 0.5 ) / size ).xy;
  vec2 b = texture2D( field, ( bCell + 0.5 ) / size ).xy;
  float angle = 3.14159265359 * within / span;
  vec2 twiddle = vec2( cos( angle ), sin( angle ) );
  vec2 turned = vec2( b.x * twiddle.x - b.y * twiddle.y, b.x * twiddle.y + b.y * twiddle.x );
  gl_FragColor = vec4( q >= span ? a - turned : a + turned, 0.0, 1.0 );
}
`,nl=class{size;patch;scene=new u;camera=new l(-1,1,1,-1,0,1);quad;spectrumMaterial;butterflyMaterial;ping;pong;output;spectrum;wind=NaN;seed=NaN;drawnRenderer;drawnSpectrum;drawnTime=NaN;constructor(e=256,t=64){this.size=e,this.patch=t;let n=new pe;n.setAttribute(`position`,new se(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));let r={type:Ke,format:P,minFilter:Le,magFilter:Le,depthBuffer:!1,generateMipmaps:!1};this.ping=new Oe(e,e,r),this.pong=new Oe(e,e,r),this.output=new Oe(e,e,{type:Fe,format:P,minFilter:Be,magFilter:Be,wrapS:nt,wrapT:nt,depthBuffer:!1,generateMipmaps:!1}),this.spectrumMaterial=new Vt({uniforms:{spectrum:{value:null},size:{value:e},patchSize:{value:t},time:{value:0}},vertexShader:$c,fragmentShader:el,depthTest:!1,depthWrite:!1}),this.butterflyMaterial=new Vt({uniforms:{field:{value:null},size:{value:e},span:{value:1},alongRows:{value:1}},vertexShader:$c,fragmentShader:tl,depthTest:!1,depthWrite:!1}),this.quad=new tt(n,this.spectrumMaterial),this.quad.frustumCulled=!1,this.scene.add(this.quad)}setWind(e,t=1){e===this.wind&&t===this.seed&&this.spectrum||(this.wind=e,this.seed=t,this.spectrum?.dispose(),this.spectrum=new ke(Qc(e,t,this.size,this.patch),this.size,this.size,P,Ke),this.spectrum.minFilter=Le,this.spectrum.magFilter=Le,this.spectrum.needsUpdate=!0)}render(e,t){if(this.spectrum||this.setWind(0),e===this.drawnRenderer&&this.spectrum===this.drawnSpectrum&&t===this.drawnTime){this.useOutput();return}let n=e.getRenderTarget();this.quad.material=this.spectrumMaterial,this.spectrumMaterial.uniforms.spectrum.value=this.spectrum,this.spectrumMaterial.uniforms.time.value=t,e.setRenderTarget(this.ping),e.render(this.scene,this.camera),this.quad.material=this.butterflyMaterial;let r=Math.round(Math.log2(this.size)),i=this.ping,a=this.pong;for(let t=0;t<2*r;t+=1){let n=t===2*r-1;this.butterflyMaterial.uniforms.field.value=i.texture,this.butterflyMaterial.uniforms.span.value=1<<t%r,this.butterflyMaterial.uniforms.alongRows.value=+(t<r),e.setRenderTarget(n?this.output:a),e.render(this.scene,this.camera),[i,a]=[a,i]}e.setRenderTarget(n),this.drawnRenderer=e,this.drawnSpectrum=this.spectrum,this.drawnTime=t,this.useOutput()}useOutput(){ue.waterChopMap.value=this.output.texture,ue.waterChopPatch.value=this.patch,ue.waterChopFft.value=1}disable(){ue.waterChopFft.value=0}dispose(){this.disable(),this.ping.dispose(),this.pong.dispose(),this.output.dispose(),this.spectrum?.dispose(),this.spectrumMaterial.dispose(),this.butterflyMaterial.dispose(),this.quad.geometry.dispose()}},rl=class{grid={xMin:-1,zMin:-1,spacing:1,nx:3,nz:3};time=0;bedRevision=0;write(e){e.fill(0)}writeBed(e){e.fill(-5)}};function il(e,t,n,r=14){let{status:i,board:a,rider:o}=e.snapshot;if(!i.ride)return;let s=-1/0;for(let t=2;t<=r;t+=2)s=Math.max(s,e.heightAt(a[0],a[2]-t));return{ride:i.ride,peelDirection:i.peel?.direction??0,board:{x:a[0],z:a[2],heading:o[z.heading]},focusZ:t,crestBehind:s-n}}var al=.35,ol=.25,sl=.35,cl=.75,ll=15,ul=1.5,dl=1,fl=Math.PI/180,pl=35*fl,ml=6,hl=.35,gl=90*fl,_l=120*fl,vl=.7,yl=60*fl,bl=30*fl,xl=8,Sl=-30*fl,Cl=1.5,wl=.3,Tl=.6,El=60*fl,Dl=-.5,Ol=-1,kl=.4,Al=1.5,jl=.3,Ml=25*fl,Nl=.65,Pl=1,Fl=12*fl,Il=45*fl,Ll=160*fl,Rl=30*fl,zl=-.5,Bl=3,Vl=10,Hl=.45,Ul=45*fl,Wl=60*fl,Gl=25*fl,Kl=.7,ql=.5,Jl=.5,Yl=2,Xl=.3,Zl=5*Math.PI/4,Ql=class{state=`position`;outcome;attempts=0;rideTime=0;phase=``;turnRecords=[];flowRecords=[];waitOutside;rise;line;giveUp;clock=0;stalled=0;stall;turnLimit;bottomFace;seenFace=0;lastFace=0;popped=!1;lastHeading=NaN;travel=0;style;cutbackReach;flowFrom;bottomEnd;trimOnly;pump;flowFace=0;flowYaw=0;flowHeading=0;flowOpen=!1;pumpSide=1;turn;turnTime=0;turnFace=0;blocked;turnYaw=0;turnHeading=0;turnStart=0;turnSpeed=0;constructor(e={}){this.waitOutside=e.waitOutside??5,this.rise=e.rise??.5,this.line=(e.lineDegrees??60)*Math.PI/180,this.giveUp=e.giveUp??8,this.style=e.style??`line`,this.stall=e.stall??!0,this.turnLimit=e.turnLimit??Cl,this.bottomFace=e.bottomFace??hl,this.cutbackReach=e.cutbackReach??Vl,this.flowFrom=e.flowFrom??`drop`,this.bottomEnd=e.bottomEnd===void 0?Ml:e.bottomEnd*fl,this.trimOnly=e.trimOnly??!1,this.pump=e.pump??!1}go(){this.state=`go`,this.attempts+=1,this.clock=0,this.popped=!1,this.rideTime=0,this.stalled=0}finish(e){this.flowOpen=!1,this.state===`ride`&&this.end(e)}reset(){this.state=`position`,this.seenFace=0,this.outcome=void 0,this.rideTime=0,this.lastHeading=NaN,this.turn=void 0,this.blocked=void 0,this.phase=``,this.turnRecords.length=0,this.flowRecords.length=0,this.flowOpen=!1,this.flowFace=0,this.pumpSide=1}next(e,t){let n={paddle:!1,popUp:!1,steer:0},{ride:r}=e,i=e.board.heading,a=Number.isFinite(this.lastHeading)&&t>0?$l(i-this.lastHeading)/t:0;switch(this.lastHeading=i,r.wave.valid&&(this.travel=Math.atan2(r.wave.directionX,r.wave.directionZ)),this.state){case`position`:r.phase===`prone`&&e.focusZ-e.board.z>this.waitOutside?n.paddle=!0:this.state=`wait`;break;case`wait`:{let t=this.lastFace||Math.sign(e.peelDirection);if(t!==0&&(n.steer=this.aim(this.travel+t*pl,i,a)),e.crestBehind>this.rise)return this.go(),this.next(e,0);break}case`go`:if(this.clock+=t,r.phase===`fallen`||r.phase===`recover`)this.end(r.separation?`fell · ${r.separation}`:`no stand`);else if(r.phase===`prone`){if(r.cue&&!this.popped)n.popUp=!0,this.popped=!0;else if(this.clock>this.giveUp)this.end(`missed the wave`);else{n.paddle=!0;let t=this.openFace(e);t!==0&&(n.steer=this.aim(this.travel+t*pl,i,a))}}else r.phase===`standing`&&(this.state=`ride`);break;case`ride`:if(r.phase===`fallen`){this.closeTurn(!1,r.speed),this.closeFlow(!1,e),this.end(`fell · ${r.separation??`balance`}`);break}if(this.rideTime+=t,this.stalled=r.speed<ul?this.stalled+t:0,this.stall&&this.stalled>dl){this.closeFlow(!1,e),this.end(`the wave left`);break}this.style===`turns`&&this.openFace(e)!==0?Object.assign(n,this.turns(e,i,t)):this.style===`flow`&&(this.flowFace||this.openFace(e))!==0?Object.assign(n,this.flow(e,i,a)):n.steer=this.steer(e,i,a)}return n}steer(e,t,n,r=this.openFace(e)){let{wave:i}=e.ride,a=this.travel;if(r!==0){let e=this.line;i.valid&&i.faceFraction<sl?e+=ll*Math.PI/180:i.valid&&i.faceFraction>cl&&(e-=ll*Math.PI/180),a+=r*e}return this.aim(a,t,n)}aim(e,t,n){return Math.max(-1,Math.min(1,$l(e-t)/al-ol*n))}openFace(e){let{wave:t}=e.ride;return t.valid&&t.curlSide!==0&&(this.seenFace=-t.curlSide,this.lastFace=this.seenFace),this.seenFace===0?Math.sign(e.peelDirection):this.seenFace}turns(e,t,n){let{wave:r}=e.ride,i=this.openFace(e);if(this.turn){this.turnTime+=n,this.turnYaw+=$l(t-this.turnHeading),this.turnHeading=t;let r=this.turnFace*$l(t-this.travel),i=this.turn===`bottom`?r>_l:this.turn===`top`?r<bl:r<Sl;!i&&this.turnTime>this.turnLimit&&(this.blocked=this.turn),(i||this.turnTime>this.turnLimit)&&this.closeTurn(i,e.ride.speed)}if(!this.turn&&r.valid){let n=i*$l(t-this.travel),a=r.aheadOfCrest>xl&&n>bl?`cutback`:r.faceFraction>vl&&n>yl?`top`:r.faceFraction<this.bottomFace&&n<gl&&r.aheadOfCrest<=ml?`bottom`:void 0;a!==this.blocked&&(this.turn=a,this.turnTime=0,this.turnFace=i,this.turnYaw=0,this.turnHeading=t,this.turnStart=this.rideTime,this.turnSpeed=e.ride.speed),a===void 0&&(this.blocked=void 0)}let a=this.turn?this.turnFace:i,o=a*$l(t-this.travel);switch(this.turn){case`bottom`:return this.phase=o<El?`BOTTOM TURN · COMPRESSED`:`BOTTOM TURN · EXTENDING`,{steer:a,trim:0,crouch:o<El?Tl:0,compress:+(o<El)};case`top`:case`cutback`:{let e=r.crestBreaking>wl;return this.phase=this.turn===`cutback`?`CUTBACK · WEIGHT BACK`:e?`SNAP · WEIGHT BACK`:`TOP TURN · WEIGHT BACK`,{steer:-a,trim:e?Ol:Dl,crouch:Tl,compress:0}}default:return this.phase=o<gl?`DROPPING · CROUCHED`:`CLIMBING · EXTENDED`,{steer:0,trim:0,crouch:o<gl?Tl:0,compress:0}}}flow(e,t,n){let{wave:r}=e.ride;this.flowFace===0&&(this.flowFace=this.openFace(e));let i=this.flowFace,a=i*$l(t-this.travel),o=r.valid?r.faceFraction:0,s=r.valid?r.curlDistance:1/0,c=this.trackFlow(e,t),l=c?.seconds??0,u=i*this.flowYaw,d=s>=this.cutbackReach&&a>Il,f,p=!0;switch(c?.phase){case void 0:f=this.flowFrom;break;case`drop`:!r.valid||o<kl||r.aheadOfCrest>ml?f=`bottom`:l>Al&&([f,p]=[`bottom`,!1]);break;case`bottom`:case`rebound`:a>this.bottomEnd?f=`project`:l>Bl&&([f,p]=[`project`,!1]);break;case`project`:Math.abs(e.ride.bank??0)<=Fl||o>Nl?f=d?`cutback`:`trim`:l>Pl&&([f,p]=[d?`cutback`:`trim`,!1]);break;case`trim`:if(this.trimOnly)break;d?f=`cutback`:o<kl&&a<gl&&(f=`bottom`);break;case`cutback`:-u>Ll||a<-Rl?f=`rebound`:l>Bl&&([f,p]=[`rebound`,!1])}f&&(this.closeFlow(p),this.flowRecords.push({phase:f,at:this.rideTime,seconds:0,degrees:0,speedIn:e.ride.speed,speedOut:e.ride.speed,faceIn:o,faceOut:o,curlIn:s,curlOut:s,completed:!1}),this.flowOpen=!0,this.flowYaw=0,this.flowHeading=t,f===`trim`&&(this.pumpSide=o<.5?1:-1));let m=this.flowRecords[this.flowRecords.length-1].phase;switch(m){case`drop`:return this.phase=`FLOW · DROP`,{steer:0,trim:0,crouch:1,compress:0};case`bottom`:case`rebound`:return this.phase=m===`bottom`?`FLOW · BOTTOM TURN`:`FLOW · REBOUND`,{steer:i,trim:jl,crouch:0,compress:1};case`project`:return this.phase=`FLOW · PROJECTION`,{steer:0,trim:0,crouch:0,compress:0};case`trim`:{let e=Math.max(Gl,Ul-Wl*((r.valid?o:Hl)-Hl)),a=Math.max(-.5,Math.min(ql,$l(this.travel+i*e-t)/Kl-ol*n));if(!this.pump)return this.phase=`FLOW · TRIM`,{steer:a,trim:0,crouch:Jl,compress:0};let s=this.rideTime-this.flowRecords[this.flowRecords.length-1].at,c=this.pumpSide*Math.sin(2*Math.PI*s/Yl);return this.phase=c>0?`FLOW · PUMP · UP`:`FLOW · PUMP · DOWN`,{steer:Math.max(-1,Math.min(1,a+i*Xl*c)),trim:0,crouch:.5+.5*Math.cos(4*Math.PI*s/Yl+Zl),compress:0}}case`cutback`:return this.phase=`FLOW · CUTBACK`,{steer:-i,trim:zl,crouch:0,compress:1,rotate:-i}}}trackFlow(e,t){if(!this.flowOpen)return;let n=this.flowRecords[this.flowRecords.length-1],{wave:r}=e.ride;return this.flowYaw+=$l(t-this.flowHeading),this.flowHeading=t,n.seconds=this.rideTime-n.at,n.degrees=this.flowFace*this.flowYaw*180/Math.PI,n.speedOut=e.ride.speed,n.faceOut=r.valid?r.faceFraction:0,n.curlOut=r.valid?r.curlDistance:1/0,n}closeFlow(e,t){t&&this.trackFlow(t,t.board.heading),this.flowOpen&&=(this.flowRecords[this.flowRecords.length-1].completed=e,!1)}closeTurn(e,t){this.turn&&=(this.turnRecords.push({kind:this.turn,at:this.turnStart,seconds:this.turnTime,degrees:Math.abs(this.turnYaw)*180/Math.PI,speedIn:this.turnSpeed,speedOut:t,completed:e}),void 0)}end(e){this.state=`done`,this.outcome=e}};function $l(e){return e-2*Math.PI*Math.round(e/(2*Math.PI))}var eu=`breakline.logbook.v1`,tu=[`beach`,`point`,`reef`,`canyon`,`padang`,`pool`],nu=[`wipeout`,`complete`,`ended`],ru=[`distance`,`topSpeed`,`seconds`,`score`],iu=e=>typeof e==`object`&&e&&!Array.isArray(e)?e:{},au=e=>typeof e==`number`&&Number.isFinite(e);function ou(e){let t=iu(e);if(!tu.includes(t.spot)||!nu.includes(t.outcome)||typeof t.reason!=`string`||![t.distance,t.topSpeed,t.seconds,t.seed,t.at].every(au))return;let n=iu(t.conditions),{score:r,online:i,...a}=t;return{...a,conditions:{...Dt,...n},...au(r)?{score:r}:{},...i===!0?{online:i}:{}}}function su(e){let t=iu(e),n={};for(let e of ru){let r=t[e];au(r)&&r>=0&&(n[e]=r)}return n}var cu=class{storage;entries=[];best={};constructor(e){this.storage=e;try{let t=iu(JSON.parse(e?.getItem(`breakline.logbook.v1`)??`null`));Array.isArray(t.recent)&&(this.entries=t.recent.map(ou).filter(e=>e!==void 0).slice(0,50));let n=iu(t.bests);for(let e of tu)e in n&&(this.best[e]=su(n[e]))}catch{this.entries=[]}}get recent(){return this.entries}bests(e){return{...this.best[e]}}add(e){this.entries=[e,...this.entries].slice(0,50);let t=this.best[e.spot]??{},n=ru.filter(n=>(e[n]??-1/0)>(t[n]??-1/0));for(let r of n)t[r]=e[r];this.best[e.spot]=t;try{this.storage?.setItem(eu,JSON.stringify({recent:this.entries,bests:this.best}))}catch{}return n}},lu=new Set([`standing`,`recover`]),uu={balance:`ride.reason.balance`,"foot slip":`ride.reason.footSlip`,"lost board":`ride.reason.lostBoard`,impact:`ride.reason.impact`,reef:`ride.reason.reef`},du={"kicked out":`ride.reason.kickedOut`,"wave died":`ride.reason.waveDied`,"lost the wave":`ride.reason.lostWave`},fu=class{riding=!1;retryNoted=!1;resets;distance=0;topSpeed=0;startTime=0;lastTime=0;lastX=0;lastZ=0;slowest=1;seenReport;waitForLeave=!1;noteRetry(){this.retryNoted=!0}reset(){this.riding=!1,this.retryNoted=!1,this.resets=void 0,this.seenReport=void 0,this.waitForLeave=!1}update(e){let t=this.resets!==void 0&&e.resets>this.resets;this.resets=e.resets;let n=e.report&&e.report.id!==this.seenReport?e.report:void 0;if(e.report&&(this.seenReport=e.report.id),!this.riding){t&&(this.retryNoted=!1),lu.has(e.phase)||(this.waitForLeave=!1),e.phase===`standing`&&!this.waitForLeave&&this.begin(e);return}if(this.slowest=Math.min(this.slowest,e.timeScale??1),n){this.waitForLeave=lu.has(e.phase);let t=n.end===`fell`?uu[e.separation??`balance`]:du[n.end],{id:r,...i}=n;return this.finish(n.end===`fell`?`wipeout`:`complete`,t,i)}if(t)return this.retryNoted?this.finish(`ended`,`ride.reason.retry`):this.finish(`complete`,`ride.reason.outOfWave`);if(lu.has(e.phase)){this.distance+=Math.hypot(e.x-this.lastX,e.z-this.lastZ),this.topSpeed=Math.max(this.topSpeed,e.speed),this.lastTime=e.seaTime,this.lastX=e.x,this.lastZ=e.z;return}return e.phase===`fallen`?this.finish(`wipeout`,uu[e.separation??`balance`]):this.finish(`ended`,`ride.reason.retry`)}begin(e){this.riding=!0,this.distance=0,this.topSpeed=e.speed,this.startTime=e.seaTime,this.lastTime=e.seaTime,this.lastX=e.x,this.lastZ=e.z,this.slowest=e.timeScale??1}finish(e,t,n){this.riding=!1,this.retryNoted=!1;let r=n?n.duration:this.lastTime-this.startTime;if(!(r<1))return{outcome:e,reason:t,seconds:r,distance:n?n.distance:this.distance,topSpeed:n?n.topSpeed:this.topSpeed,...n?{report:n}:{},...this.slowest<1?{timeScale:this.slowest}:{}}}},pu=[`is-reduced-motion`,`is-high-contrast`,`has-touch`,`is-left-handed`];function mu(e,t,n){return[...e.reducedMotion?[`is-reduced-motion`]:[],...e.highContrastHud?[`is-high-contrast`]:[],...t?[`has-touch`]:[],...n===`left`?[`is-left-handed`]:[]]}function hu(e,t,n,r){let i=new Set(mu(t,n,r));for(let t of pu)e.classList.toggle(t,i.has(t));e.style.setProperty(`--ui-scale`,String(t.uiScale))}var gu=[`roar`,`distant`,`wind`,`rush`,`rail`,`bubbles`,`lipJet`,`lipRoller`,`paddle`,`popUp`,`plunge`,`leashSnap`,`knock`,`duckDive`,`click`,`chime`],_u=.25,vu=.9;function yu(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function bu(e){let t=2166136261;for(let n=0;n<e.length;n+=1)t=Math.imul(t^e.charCodeAt(n),16777619);return t>>>0}function xu(e,t,n){let r=1-Math.exp(-2*Math.PI*t/n),i=0;for(let t=0;t<e.length;t+=1)i+=r*(e[t]-i),e[t]=i;return e}function Su(e,t,n){let r=Math.exp(-2*Math.PI*t/n),i=0,a=0;for(let t=0;t<e.length;t+=1)a=r*(a+e[t]-i),i=e[t],e[t]=a;return e}function Cu(e,t){let n=new Float32Array(e);for(let r=0;r<e;r+=1)n[r]=t()*2-1;return n}function wu(e,t){let n=new Float32Array(e),r=0;for(let i=0;i<e;i+=1)r=.998*r+(t()*2-1)*.06,n[i]=r;return n}function Tu(e){let t=0;for(let n of e)t=Math.max(t,Math.abs(n));if(t>0)for(let n=0;n<e.length;n+=1)e[n]*=vu/t;return e}function Eu(e,t,n,r){let i=[1,2,3],a=i.map(()=>r()*2*Math.PI),o=e.length/t;for(let r=0;r<e.length;r+=1){let s=r/t,c=0;i.forEach((e,t)=>{c+=Math.sin(2*Math.PI*e*s/o+a[t])}),e[r]*=1-n+n*(.5+c/(2*i.length))}}function Du(e,t){let n=Math.round(4*e),r=Math.round(_u*e),i=t(n+r,n),a=i.slice(0,n);for(let e=0;e<r;e+=1){let t=e/r;a[e]=i[e]*t+i[n+e]*(1-t)}return Tu(a)}function Ou(e,t,n,r){for(let i=0;i<e.length;i+=1){let a=i/t;e[i]*=Math.min(1,a/n)*Math.exp(-a/r)}return e}function ku(e,t,n,r,i){let a=new Float32Array(e),o=0;for(let s=0;s<e;s+=1){let e=s/t;o+=2*Math.PI*(r+(n-r)*Math.exp(-e/i))/t,a[s]=Math.sin(o)*Math.exp(-e/i)}return a}function Au(e,t,n=1){for(let r=0;r<e.length;r+=1)e[r]+=n*t[r];return e}function ju(e,t,n,r){let i=xu(wu(e,r),200,n);for(let e=0;e<i.length;e+=1)i[e]*=.3;let a=0;for(;a<e;){a+=Math.round((.03+r()*.15)*n);let o=500+r()*1500,s=Math.round(.04*n);if(a<t&&a+s>t)continue;let c=0;for(let t=0;t<s&&a+t<e;t+=1){let e=t/n;c+=2*Math.PI*o*(1+3*e)/n,i[a+t]+=.6*Math.sin(c)*Math.exp(-e/.012)}}return i}function Mu(e,t,n=1){let r=yu(bu(e)^Math.imul(n,2654435761)),i=e=>Math.round(e*t);switch(e){case`roar`:return Du(t,e=>{let n=Au(xu(wu(e,r),700,t),Su(Cu(e,r),1200,t),.08);return Eu(n,t,.6,r),n});case`distant`:return Du(t,e=>{let n=xu(wu(e,r),260,t);return Eu(n,t,.4,r),n});case`wind`:return Du(t,e=>{let n=Su(xu(Cu(e,r),1400,t),300,t);return Eu(n,t,.7,r),n});case`rush`:return Du(t,e=>Su(xu(Cu(e,r),6e3,t),900,t));case`rail`:return Du(t,e=>{let n=Su(Cu(e,r),2500,t);for(let e=0;e<n.length;e+=1)n[e]*=.6+.4*Math.sin(2*Math.PI*9*e/t+r()*.2);return n});case`bubbles`:return Du(t,(e,n)=>ju(e,n,t,r));case`lipJet`:{let e=i(1.3);return Tu(Au(Ou(xu(Cu(e,r),1800,t),t,.01,.35),ku(e,t,90,38,.18),.9))}case`lipRoller`:return Tu(Ou(Su(xu(Cu(i(1.1),r),3e3,t),200,t),t,.06,.3));case`paddle`:return Tu(Ou(Su(xu(Cu(i(.35),r),4500,t),700,t),t,.005,.07));case`popUp`:{let e=i(.45);return Tu(Au(Ou(xu(Cu(e,r),2500,t),t,.005,.08),ku(e,t,140,70,.06),.7))}case`plunge`:{let e=i(1.4);return Tu(Au(Ou(xu(Cu(e,r),2200,t),t,.01,.4),ku(e,t,110,45,.2),.7))}case`leashSnap`:{let e=i(.5),n=new Float32Array(e);for(let r=0;r<e;r+=1){let e=r/t;n[r]=Math.sin(2*Math.PI*(320-180*Math.min(1,e/.3))*e)*Math.exp(-e/.09)}return Tu(Au(Ou(Su(Cu(e,r),1500,t),t,.001,.02),n,.6))}case`knock`:{let e=i(.35);return Tu(Au(ku(e,t,95,60,.07),Ou(xu(Cu(e,r),700,t),t,.002,.05),.35))}case`duckDive`:{let e=i(.9);return Tu(Au(Ou(xu(Cu(e,r),1200,t),t,.02,.25),ku(e,t,80,40,.15),.8))}case`click`:return Tu(Ou(Su(Cu(i(.03),r),3e3,t),t,5e-4,.004));case`chime`:{let e=i(.9),n=new Float32Array(e);for(let r=0;r<e;r+=1){let e=r/t;n[r]=(Math.sin(2*Math.PI*880*e)+.5*Math.sin(2*Math.PI*1320*e))*Math.min(1,e/.005)*Math.exp(-e/.25)}return Tu(n)}}}var Nu=[`CC0`,`generated`],Pu=44100,Fu=e=>typeof e==`object`&&e&&!Array.isArray(e)?e:{};function Iu(e){let t=Fu(e);return typeof t.file==`string`&&t.file.length>0&&typeof t.source==`string`&&typeof t.author==`string`&&Nu.includes(t.licence)}function Lu(e){let{variants:t,level:n,...r}=e,i={...r};if(Array.isArray(t)){let n=t.filter((n,r)=>typeof n==`string`&&n.length>0&&n!==e.file&&t.indexOf(n)===r);n.length>0&&(i.variants=n.slice(0,15))}return typeof n==`number`&&n>=0&&n<=2&&(i.level=n),i}function Ru(e){let t=Fu(Fu(e).sounds),n={sounds:{}};for(let e of gu){if(!(e in t))continue;let r=Fu(t[e]),i=Array.isArray(r.candidates)?r.candidates.filter(Iu).map(Lu):[],a=Number.isInteger(r.chosen)&&r.chosen>=0&&r.chosen<i.length?r.chosen:0,o=typeof r.gain==`number`&&r.gain>=0&&r.gain<=2?r.gain:1;n.sounds[e]={candidates:i,chosen:a,gain:o}}return n}function zu(e){return[e.file,...e.variants??[]]}var Bu=class{count;random;order=[];last=-1;constructor(e,t=Math.random){this.count=e,this.random=t}next(){if(this.count<=1)return 0;if(this.order.length===0){let e=Array.from({length:this.count},(e,t)=>t);for(let t=e.length-1;t>0;--t){let n=Math.min(t,Math.floor(this.random()*(t+1)));[e[t],e[n]]=[e[n],e[t]]}e[0]===this.last&&([e[0],e[e.length-1]]=[e[e.length-1],e[0]]),this.order=e}return this.last=this.order.shift(),this.last}},Vu=async e=>{let t=await fetch(e);if(!t.ok)throw Error(`${e}: ${t.status}`);return t.arrayBuffer()},Hu=class{context;manifest;ready;synthesised=new Map;recordings=new Map;cycles=new Map;candidates=new Map;fetcher;base;random;constructor(e,t,n={}){this.context=e,this.manifest=t,this.fetcher=n.fetcher??Vu,this.base=n.base??`assets/audio/`,this.random=n.random??Math.random;let r=Object.keys(t.sounds).map(async e=>{let n=t.sounds[e];if(!n.candidates[n.chosen])return;let r=await this.pool(e,n.chosen);r.length>0&&this.recordings.set(e,r)});this.ready=Promise.all(r).then(()=>void 0)}buffer(e){return this.recordings.get(e)?.[0]??this.synthesisedBuffer(e)}variant(e){let t=this.recordings.get(e);return t?t[this.cycle(`${e}`,t.length).next()]:this.synthesisedBuffer(e)}poolSize(e){return this.recordings.get(e)?.length??0}recorded(e){return this.recordings.has(e)}gain(e){if(!this.recorded(e))return 1;let t=this.manifest.sounds[e];return(t?.gain??1)*(t?.candidates[t.chosen]?.level??1)}candidateLevel(e,t){return this.manifest.sounds[e]?.candidates[t]?.level??1}async candidate(e,t){let n=await this.pool(e,t);return n.length>0?n[this.cycle(`${e}:${t}`,n.length).next()]:void 0}pool(e,t){let n=`${e}:${t}`,r=this.candidates.get(n);if(!r){let i=this.manifest.sounds[e]?.candidates[t];r=i?this.loadAll(zu(i)):Promise.resolve([]),this.candidates.set(n,r)}return r}cycle(e,t){let n=this.cycles.get(e);return n||(n=new Bu(t,this.random),this.cycles.set(e,n)),n}async loadAll(e){return(await Promise.all(e.map(e=>this.load(e)))).filter(e=>e!==void 0)}async load(e){try{return await this.context.decodeAudioData(await this.fetcher(`${this.base}${e}`))}catch(t){console.warn(`Recording ${e} unavailable; keeping the rest of its sound.`,t);return}}synthesisedBuffer(e){let t=this.synthesised.get(e);if(!t){let n=Mu(e,this.context.sampleRate);t=this.context.createBuffer(1,n.length,this.context.sampleRate),t.copyToChannel(n,0),this.synthesised.set(e,t)}return t}},Uu=[`bubbles`],Wu={lipJet:1,lipRoller:1,paddle:1.5};function Gu(e,t){let n=Wu[e];return n?2**(n*(2*t-1)/12):1}var Ku=18e3,qu=8,Ju=1230;function Yu(e){if(!(e>qu))return Ku;let t=Ju*(e/1e3)**-.56;return Math.min(Ku,Math.max(900,t))}var Xu={lipJet:.18,lipRoller:.25,paddle:.45,popUp:0,plunge:0,leashSnap:0,knock:.15,duckDive:.5},Zu=8,Qu=.85,$u=.55,ed=10,td=class{pending=new Map;last=new Map;clock=0;release(e,t){this.clock+=t;for(let t of e){let e=this.pending.get(t.key)??{id:t.id,amount:0,size:0,w:0,wx:0,wy:0,wz:0},n=Math.max(t.amount,1e-9);e.amount+=t.amount,e.size=Math.max(e.size,t.size??0),e.w+=n,e.wx+=t.x*n,e.wy+=t.y*n,e.wz+=t.z*n,this.pending.set(t.key,e)}let n=[];for(let[e,t]of this.pending)this.clock-(this.last.get(e)??-1/0)<Xu[t.id]||(n.push(t),this.pending.delete(e),this.last.set(e,this.clock));for(let[e,t]of this.last)this.clock-t>2&&this.last.delete(e);return n}clear(){this.pending.clear()}},nd=20,rd=3,id=.3,ad=12,od=.5,sd=12,cd=30,ld=.6,ud=4,dd=.5,fd=2,pd=10,md=2,hd=.6,gd=.25,_d=.85,vd=e=>Math.min(1,Math.max(0,e)),yd=(e,t,n)=>vd(Math.log10(1+Math.max(0,e)/t)/n),bd=.5;function xd(e){return e.id!==`lipJet`&&e.id!==`lipRoller`?1:Math.min(1,Math.max(bd,Math.cbrt(2/Math.max(e.size,1e-9))))}function Sd(e,t){return e===`lipJet`||e===`lipRoller`?yd(t,dd,fd):e===`paddle`?yd(t,pd,md):e===`popUp`?hd:e===`leashSnap`?Qu:e===`duckDive`?$u:vd(e===`knock`?.25+.75*(t-Zu)/52:.4+t/15)}function Cd(e,t=new td){let{paused:n,listener:r,board:i}=e,a=n?gd:1,o=[];for(let t=0;t<8;t+=1){let n=e.roar[t*3];o.push({id:`roar`,key:`roar:${t}`,rate:1,gain:a*yd(n,nd,rd),...n>0?{position:{x:e.roar[t*3+1],y:0,z:e.roar[t*3+2]}}:{}})}let s=vd(Math.abs(e.windSpeed)/ad);o.push({id:`distant`,key:`distant`,rate:1,gain:a*vd((e.significantHeight-id)/2.7)},{id:`wind`,key:`wind`,rate:.9+.2*s,gain:a*s});let c=i?{x:i.x,y:i.y,z:i.z}:void 0,l=i?.speed??0;o.push({id:`rush`,key:`rush`,rate:.8+.5*vd(l/sd),gain:n||!i?0:vd((l-od)/11.5),...c?{position:c}:{}},{id:`rail`,key:`rail`,rate:1,gain:n||!i?0:vd(Math.abs(i.sideslip)*l/cd),...c?{position:c}:{}},{id:`bubbles`,key:`bubbles`,rate:1,gain:r.underwater?a*ld:0});let u=[];if(n)t.clear();else{let n=[];for(let t=0;t<e.lipHitCount;t+=1){let r=t*5,i=e.lipHits[r],a=e.lipHits[r+1],o=e.lipHits[r+2],s=e.lipHits[r+3],c=e.lipHits[r+4],l=s>=ud?`lipJet`:`lipRoller`;n.push({id:l,key:`${l}:${Math.round(i/ed)}:${Math.round(a/ed)}`,amount:o*s*s,size:c,x:i,y:0,z:a})}for(let t=0;t<e.strokeHitCount;t+=1){let r=t*4;n.push({id:`paddle`,key:`paddle`,amount:e.strokeHits[r+2],x:e.strokeHits[r],y:0,z:e.strokeHits[r+1]})}let i=e.ride;if(i&&i.phase!==i.previousPhase){let e=c??{x:r.x,y:r.y,z:r.z};i.previousPhase===`prone`&&i.phase===`push`&&n.push({id:`popUp`,key:`popUp`,amount:1,...e}),i.phase===`fallen`&&n.push({id:`plunge`,key:`plunge`,amount:i.speed,...e})}if(i){let e=c??{x:r.x,y:r.y,z:r.z};i.leashSnapped&&i.previouslySnapped===!1&&n.push({id:`leashSnap`,key:`leashSnap`,amount:1,...e}),(i.knock??0)>=Zu&&n.push({id:`knock`,key:`knock`,amount:i.knock,...e}),(i.duck??0)>=.5&&(i.previousDuck??0)<.5&&n.push({id:`duckDive`,key:`duckDive`,amount:1,...e})}for(let r of t.release(n,e.dt))u.push({id:r.id,rate:xd(r),gain:Sd(r.id,r.amount),position:{x:r.wx/r.w,y:r.wy/r.w,z:r.wz/r.w}})}return u.sort((e,t)=>t.gain-e.gain),u.length>32&&(u.length=32),{loops:o,oneShots:u,muffle:r.underwater||e.ride?.headUnder?1:n?_d:0,pauseMuffle:n?_d:0,playbackRate:e.timeScale}}var wd={roar:`sea`,distant:`sea`,wind:`sea`,bubbles:`sea`,rush:`board`,rail:`board`},Td={lipJet:`sea`,lipRoller:`sea`,paddle:`board`,popUp:`board`,plunge:`board`,leashSnap:`board`,knock:`board`,duckDive:`board`},$=.08,Ed=18e3,Dd=400,Od=2,kd=.001,Ad=class e{context;master;mute;muffle;buses;seaDry;dryMuffle;loops=new Map;bank;static create(){let t=globalThis.AudioContext??globalThis.webkitAudioContext;if(!t)return;let n=globalThis.navigator?.audioSession;return n&&(n.type=`ambient`),new e(jd(t))}constructor(e){this.context=e;let t=e,n=t.createDynamicsCompressor();n.threshold.value=-6,n.knee.value=6,n.ratio.value=12,n.attack.value=.003,n.release.value=.25,n.connect(t.destination),this.mute=t.createGain(),this.mute.connect(n),this.master=t.createGain(),this.master.connect(this.mute),this.muffle=t.createBiquadFilter(),this.muffle.type=`lowpass`,this.muffle.frequency.value=Ed,this.muffle.connect(this.master),this.buses={sea:t.createGain(),board:t.createGain(),ui:t.createGain()},this.buses.sea.connect(this.muffle),this.buses.board.connect(this.muffle),this.buses.ui.connect(this.master),this.dryMuffle=t.createBiquadFilter(),this.dryMuffle.type=`lowpass`,this.dryMuffle.frequency.value=Ed,this.dryMuffle.connect(this.master),this.seaDry=t.createGain(),this.seaDry.connect(this.dryMuffle),this.bank=new Hu(t,{sounds:{}})}useManifest(e){return this.bank=new Hu(this.context,e),this.bank.ready}get soundBank(){return this.bank}resume(){this.context.state!==`running`&&this.context.resume()}suspend(){this.context.state===`running`&&this.context.suspend()}setMuted(e){this.mute.gain.setTargetAtTime(+!e,this.context.currentTime,$)}setVolumes(e){let t=this.context.currentTime;this.master.gain.setTargetAtTime(e.master,t,$),this.buses.sea.gain.setTargetAtTime(e.sea,t,$),this.seaDry.gain.setTargetAtTime(e.sea,t,$),this.buses.board.gain.setTargetAtTime(e.board,t,$),this.buses.ui.gain.setTargetAtTime(e.ui,t,$)}setMono(e){let t=this.context.destination;t.channelCountMode=`explicit`,t.channelInterpretation=`speakers`,t.channelCount=e?1:Math.min(2,t.maxChannelCount||2)}busLevel(e){return e===`master`?this.master.gain.value:this.buses[e].gain.value}audition(e,t){let n=this.context.createBufferSource();n.buffer=e;let r=this.context.createGain();r.gain.value=t,n.connect(r).connect(this.buses.ui),n.onended=()=>r.disconnect(),n.start(),e.duration>4&&n.stop(this.context.currentTime+4)}setBusLevel(e,t){(e===`master`?this.master:this.buses[e]).gain.setTargetAtTime(t,this.context.currentTime,$),e===`sea`&&this.seaDry.gain.setTargetAtTime(t,this.context.currentTime,$)}playUi(e){let t=this.context.createBufferSource();t.buffer=this.bank.buffer(e);let n=this.context.createGain();n.gain.value=this.bank.gain(e)*(e===`click`?.35:.6),t.connect(n).connect(this.buses.ui),t.onended=()=>n.disconnect(),t.start()}update(e,t,n){let r=this.context;if(r.state!==`running`)return;let i=r.currentTime;this.placeListener(t,i),this.muffle.frequency.setTargetAtTime(Md(e.muffle),i,$*2),this.dryMuffle.frequency.setTargetAtTime(Md(e.pauseMuffle),i,$*2);for(let r of e.loops){let a=this.loops.get(r.key),o=this.bank.buffer(r.id);if(!a||a.buffer!==o){if(r.gain<kd)continue;a&&this.stopLoop(r.key,a),a=this.startLoop(r.id,o,r.position?Yu(Nd(t,r.position)):void 0),this.loops.set(r.key,a)}let s=r.gain*this.bank.gain(r.id);a.gain.gain.setTargetAtTime(s,i,$),a.source.playbackRate.setTargetAtTime(r.rate*e.playbackRate,i,$),a.panner&&r.position&&this.place(a.panner,r.position,i),a.air&&r.position&&a.air.frequency.setTargetAtTime(Yu(Nd(t,r.position)),i,$),a.silentFor=s<kd?a.silentFor+n:0,a.silentFor>Od&&this.stopLoop(r.key,a)}for(let n of e.oneShots){let a=r.createBufferSource();a.buffer=this.bank.variant(n.id),a.playbackRate.value=n.rate*Gu(n.id,Math.random())*e.playbackRate;let o=r.createGain();o.gain.value=n.gain*this.bank.gain(n.id);let s=this.air(Yu(Nd(t,n.position))),c=this.panner();this.place(c,n.position,i,!0),a.connect(o).connect(s).connect(c).connect(this.buses[Td[n.id]]),a.onended=()=>{o.disconnect(),s.disconnect(),c.disconnect()},a.start()}}startLoop(e,t,n){let r=this.context,i=r.createBufferSource();i.buffer=t,i.loop=!0;let a=r.createGain();a.gain.value=0;let o=n===void 0?void 0:this.air(n),s=n===void 0?void 0:this.panner(),c=Uu.includes(e)?this.seaDry:this.buses[wd[e]];return i.connect(a),o&&s?a.connect(o).connect(s).connect(c):a.connect(c),i.start(0,Math.random()*t.duration),{buffer:t,source:i,gain:a,air:o,panner:s,silentFor:0}}stopLoop(e,t){t.source.stop(),t.source.disconnect(),t.gain.disconnect(),t.air?.disconnect(),t.panner?.disconnect(),this.loops.delete(e)}air(e){let t=this.context.createBiquadFilter();return t.type=`lowpass`,t.Q.value=-3.01,t.frequency.value=e,t}panner(){let e=this.context.createPanner();return e.panningModel=`HRTF`,e.distanceModel=`inverse`,e.refDistance=8,e.rolloffFactor=1,e.maxDistance=2e3,e}place(e,t,n,r=!1){e.positionX?r?(e.positionX.value=t.x,e.positionY.value=t.y,e.positionZ.value=t.z):(e.positionX.setTargetAtTime(t.x,n,$),e.positionY.setTargetAtTime(t.y,n,$),e.positionZ.setTargetAtTime(t.z,n,$)):e.setPosition(t.x,t.y,t.z)}placeListener(e,t){let n=this.context.listener;n.positionX?(n.positionX.setTargetAtTime(e.x,t,$/2),n.positionY.setTargetAtTime(e.y,t,$/2),n.positionZ.setTargetAtTime(e.z,t,$/2),n.forwardX.setTargetAtTime(e.forward.x,t,$/2),n.forwardY.setTargetAtTime(e.forward.y,t,$/2),n.forwardZ.setTargetAtTime(e.forward.z,t,$/2),n.upX.value=0,n.upY.value=1,n.upZ.value=0):(n.setPosition(e.x,e.y,e.z),n.setOrientation(e.forward.x,e.forward.y,e.forward.z,0,1,0))}};function jd(e){try{return new e({sampleRate:Pu})}catch{return new e}}function Md(e){return Ed*(Dd/Ed)**e}function Nd(e,t){return Math.hypot(t.x-e.x,t.y-e.y,t.z-e.z)}var Pd={phase:`idle`,muted:!1,hidden:!1,muteInBackground:!0};function Fd(e){return e.hidden&&e.muteInBackground?`suspended`:`running`}function Id(e,t){switch(t.type){case`gesture`:return e.phase===`idle`?{...e,phase:Fd(e)}:e;case`visibility`:{let n={...e,hidden:t.hidden};return e.phase===`idle`?n:{...n,phase:Fd(n)}}case`muteInBackground`:{let n={...e,muteInBackground:t.on};return e.phase===`idle`?n:{...n,phase:Fd(n)}}case`toggleMute`:return{...e,muted:!e.muted};case`setMuted`:return{...e,muted:t.muted}}}var Ld=e=>e.phase===`running`,Rd=e=>Ld(e)&&!e.muted,zd=Cd({dt:0,timeScale:1,paused:!1,listener:{x:0,y:0,z:0,underwater:!1},roar:new Float32Array(24),lipHits:new Float32Array(320),lipHitCount:0,strokeHits:new Float32Array(256),strokeHitCount:0,significantHeight:0,windSpeed:0}),Bd=class{settings;onMuteChange;engine;state;gesture=()=>this.dispatch({type:`gesture`});shaper=new td;constructor(e,t=()=>{}){this.settings=e,this.onMuteChange=t,this.state={...Pd,hidden:typeof document<`u`&&document.hidden,muteInBackground:e.value.audio.muteInBackground},window.addEventListener(`pointerdown`,this.gesture,{capture:!0}),window.addEventListener(`keydown`,this.gesture,{capture:!0}),document.addEventListener(`visibilitychange`,()=>this.dispatch({type:`visibility`,hidden:document.hidden})),e.subscribe((e,t)=>{t===`audio`&&(this.engine?.setVolumes(e.audio),this.dispatch({type:`muteInBackground`,on:e.audio.muteInBackground})),t===`accessibility`&&this.engine?.setMono(e.accessibility.monoAudio)})}get muted(){return this.state.muted}toggleMute(){this.dispatch({type:`toggleMute`}),this.onMuteChange()}frame(e,t,n){this.engine&&Ld(this.state)&&this.engine.update(e?Cd(e,this.shaper):zd,t,n)}playUi(e){this.engine&&Rd(this.state)&&this.engine.playUi(e)}get audioEngine(){return this.engine}dispatch(e){let t=Id(this.state,e);t.phase!==`idle`&&!this.engine&&this.start(this.settings.value),this.state=t,this.engine&&(Ld(t)?this.engine.resume():this.engine.suspend(),this.engine.setMuted(t.muted)),t.phase!==`idle`&&(window.removeEventListener(`pointerdown`,this.gesture,{capture:!0}),window.removeEventListener(`keydown`,this.gesture,{capture:!0}))}start(e){this.engine=Ad.create(),this.engine&&(this.engine.setVolumes(e.audio),this.engine.setMono(e.accessibility.monoAudio),fetch(`assets/audio/sounds.json`).then(e=>e.ok?e.json():{sounds:{}}).then(e=>this.engine?.useManifest(Ru(e))).catch(e=>console.warn(`No sound manifest; playing the synthesised sounds.`,e)))}},Vd=class{list;constructor(e){this.list=e}render(e){this.list.replaceChildren(...e.map(({label:e,value:t})=>{let n=document.createElement(`div`),r=document.createElement(`dt`),i=document.createElement(`dd`);return r.textContent=e,i.textContent=t,n.append(r,i),n}))}},Hd={name:`surfing-game`,private:!0,version:`0.1.0`,type:`module`,scripts:{dev:`vite --host 0.0.0.0`,build:`tsc -b && vite build`,test:`vitest run`,preview:`vite preview --host 0.0.0.0`,"report:rideability":`rolldown scripts/rideability-report.ts -o dist/scripts/rideability-report.mjs --format esm --platform node && node dist/scripts/rideability-report.mjs`,"record:ride":`node scripts/ride-video-receiver.mjs recordings`,"report:tubes":`rolldown scripts/tube-report.ts -o dist/scripts/tube-report.mjs --format esm --platform node && node dist/scripts/tube-report.mjs`,"report:catch":`rolldown scripts/catch-report.ts -o dist/scripts/catch-report.mjs --format esm --platform node && node dist/scripts/catch-report.mjs`,"report:ride":`rolldown scripts/ride-report.ts -o dist/scripts/ride-report.mjs --format esm --platform node && node dist/scripts/ride-report.mjs`,"report:carve":`rolldown scripts/carve-lab.ts -o dist/scripts/carve-lab.mjs --format esm --platform node && node dist/scripts/carve-lab.mjs`,"assets:skies":`rolldown scripts/assets/fetch-skies.ts -o dist/scripts/fetch-skies.mjs --format esm --platform node && node dist/scripts/fetch-skies.mjs`,"assets:surfers":`/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/assets/build_surfers.py && node scripts/assets/pack-surfers.mjs`,"report:sound":`rolldown scripts/sound-report.ts -o dist/scripts/sound-report.mjs --format esm --platform node && node dist/scripts/sound-report.mjs`,"record:session":`node scripts/browser/record-session.mjs`,"survey:fps":`node scripts/browser/fps-survey.mjs`,"report:fps":`node scripts/browser/fps-report.mjs`,"lesson:wave":`rolldown scripts/lesson-wave.ts -o dist/scripts/lesson-wave.mjs --format esm --platform node && node dist/scripts/lesson-wave.mjs`,barrels:`rolldown scripts/barrel-library.ts -o dist/scripts/barrel-library.mjs --format esm --platform node && node dist/scripts/barrel-library.mjs`,"report:whitewater":`rolldown scripts/whitewater-report.ts -o dist/scripts/whitewater-report.mjs --format esm --platform node && node dist/scripts/whitewater-report.mjs`,"report:particles":`rolldown scripts/particle-report.ts -o dist/scripts/particle-report.mjs --format esm --platform node && node dist/scripts/particle-report.mjs`,"report:particle-overhead":`rolldown scripts/particle-overhead-report.ts -o dist/scripts/particle-overhead-report.mjs --format esm --platform node && node dist/scripts/particle-overhead-report.mjs`,"report:duckdive":`rolldown scripts/duck-dive-report.ts -o dist/scripts/duck-dive-report.mjs --format esm --platform node && node dist/scripts/duck-dive-report.mjs`,"report:holddown":`rolldown scripts/holddown-report.ts -o dist/scripts/holddown-report.mjs --format esm --platform node && node dist/scripts/holddown-report.mjs`,"report:sizes":`rolldown scripts/size-report.ts -o dist/scripts/size-report.mjs --format esm --platform node && node dist/scripts/size-report.mjs`,"report:drift":`rolldown scripts/drift-report.ts -o dist/scripts/drift-report.mjs --format esm --platform node && node dist/scripts/drift-report.mjs`,server:`npm run build && npm run build:server && node dist-server/server.mjs`,"server:dev":`npm run build:server && STATIC_DIR=dist node dist-server/server.mjs`,"build:server":`tsc -p server/tsconfig.json && rolldown server/main.ts -o dist-server/server.mjs --format esm --platform node --external ws`,"typecheck:server":`tsc -p server/tsconfig.json`,"bots:record":`rolldown scripts/bot-tracks.ts -o dist/scripts/bot-tracks.mjs --format esm --platform node && node dist/scripts/bot-tracks.mjs`,"server:bots":`npm run build:server && BOTS=1 node dist-server/server.mjs`,deploy:`fly deploy --build-arg BUILD_ID=$(git rev-parse --short HEAD)`,"report:body":`rolldown scripts/body-report.ts -o dist/scripts/body-report.mjs --format esm --platform node && node dist/scripts/body-report.mjs`,"report:stances":`rolldown scripts/stance-report.ts -o dist/scripts/stance-report.mjs --format esm --platform node && node dist/scripts/stance-report.mjs`,"play:jev":`rolldown scripts/jev/jevSurf.ts -o dist/scripts/jev-surf.mjs --format esm --platform node && node dist/scripts/jev-surf.mjs`,"film:jev":`rolldown scripts/jev/jevBridge.ts -o dist/scripts/jev-bridge.mjs --format esm --platform node && node dist/scripts/jev-bridge.mjs`},dependencies:{three:`^0.186.1`,ws:`^8.22.0`},devDependencies:{"@types/node":`^22.20.4`,"@types/three":`^0.186.0`,"@types/ws":`^8.18.1`,"@webgpu/types":`^0.1.74`,gltfpack:`^1.3.0`,"mp4-muxer":`^5.2.2`,typescript:`~5.9.3`,vite:`^8.3.1`,vitest:`^5.0.1`}},Ud=e=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,Wd={surf:Ud(`<path d="M2 17c2.5 0 3.5-2.5 6-2.5s3.5 2.5 6 2.5 3.5-2.5 6-2.5"/><path d="M4 12.5C5.5 7 10.5 4.5 15 6.5c2.6 1.2 3.4 4 1.8 5.6-1.3 1.3-3.8.8-3.8-1.3"/>`),waveLab:Ud(`<path d="M9 3h6"/><path d="M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.2V3"/><path d="M7.2 15.5c1.6-.9 3.2.9 4.8 0s3.2-.9 4.8 0"/>`),multiplayer:Ud(`<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8"/><circle cx="17" cy="9" r="2.4"/><path d="M16.2 14.3c2.7.2 4.3 2.3 4.3 5"/>`),logbook:Ud(`<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12.5H8.5A3.5 3.5 0 0 1 5 17z"/><path d="M5 17a3.5 3.5 0 0 1 3.5-3.5H19"/><path d="M9 8.5h6"/>`),settings:Ud(`<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>`),fullscreen:Ud(`<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>`),pause:Ud(`<path d="M9 5v14M15 5v14"/>`),back:Ud(`<path d="M14.5 5.5 8 12l6.5 6.5"/>`),sound:Ud(`<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>`),muted:Ud(`<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>`),school:Ud(`<path d="M3 17.5c3.5 2 14.5 2 18 0"/><path d="M12 4 3 8l9 4 9-4z"/><path d="M7 10v3.5c1.5 1.3 8.5 1.3 10 0V10"/><path d="M21 8v4"/>`),follow:Ud(`<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>`),play:Ud(`<path d="M8 5.5v13l10-6.5z"/>`),step:Ud(`<path d="M7 5.5v13l8-6.5z"/><path d="M18 5v14"/>`),eye:Ud(`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>`)},Gd=3.6,Kd=2.236936,qd=3.28084;function Jd(e,t){let n=e*(t===`metric`?Gd:Kd);return{value:Math.round(n).toString(),unit:t===`metric`?`km/h`:`mph`}}function Yd(e,t){let{value:n,unit:r}=Jd(e,t);return`${n} ${r}`}function Xd(e,t){return t===`metric`?`${e.toFixed(1)} m`:`${(e*qd).toFixed(1)} ft`}function Zd(e,t){return t===`metric`?`${Math.round(e)} m`:`${Math.round(e*qd)} ft`}function Qd(e){return`${e.toFixed(1)} s`}var $d={wipeout:`end.wipeout`,complete:`end.complete`,ended:`end.ended`},ef=`—`;function tf(e,t){let n=(t-e)/1e3;return n<60?Y(`log.justNow`):n<3600?Y(`log.minutesAgo`,{n:Math.floor(n/60)}):n<86400?Y(`log.hoursAgo`,{n:Math.floor(n/3600)}):new Date(e).toLocaleDateString(`en`)}function nf(e,t,n){return{spots:Pe.map(n=>{let r=e.bests(n);return{spot:n,name:`spot.${n}`,bests:[{label:`end.distance`,value:r.distance===void 0?ef:Zd(r.distance,t)},{label:`end.topSpeed`,value:r.topSpeed===void 0?ef:Yd(r.topSpeed,t)},{label:`end.time`,value:r.seconds===void 0?ef:Qd(r.seconds)}]}}),recent:e.recent.map(e=>({title:`${Y(`spot.${e.spot}`)} · ${Y($d[e.outcome])}${e.online?` · ${Y(`log.online`)}`:``}`,detail:[Zd(e.distance,t),Yd(e.topSpeed,t),Qd(e.seconds),tf(e.at,n)].join(` · `)})),empty:e.recent.length===0}}function rf(e,t){let n=Q(`div`,{class:`log-spots`},...e.spots.map(e=>Q(`div`,{class:`log-spot`},Q(`h3`,{text:Y(e.name)}),Q(`dl`,{},...e.bests.map(e=>Q(`div`,{},Q(`dt`,{text:Y(e.label)}),Q(`dd`,{text:e.value}))))))),r=e.empty?Q(`p`,{class:`log-empty`,text:Y(`log.empty`)}):Q(`ol`,{class:`log-recent`},...e.recent.map(e=>Q(`li`,{},Q(`strong`,{text:e.title}),Q(`small`,{text:e.detail}))));return Q(`section`,{class:`screen screen-panel`,attrs:{"aria-label":Y(`log.title`)}},Q(`div`,{class:`panel`},Q(`header`,{class:`panel-header`},Q(`button`,{class:`icon-back`,attrs:{type:`button`,"aria-label":Y(`surf.back`)},dataset:{nav:``,navDefault:``},on:{click:t}},pc(Wd.back)),Q(`h2`,{text:Y(`log.title`)})),Q(`h3`,{class:`panel-subhead`,text:Y(`log.bests`)}),n,Q(`h3`,{class:`panel-subhead`,text:Y(`log.recent`)}),r))}var af=(e,t)=>t.map(t=>({value:t,label:Y(`${e}.${t}`)})),of=[`renderScale`,`nativePixelDensity`,`frameLimit`,`waterSimulation`,`seaDetail`,`waterLook`,`caustics`,`sprayMist`,`particles`,`oceanView`,`foam`];function sf(e,t){let n=e.graphics,r=e=>Oo.includes(e),i=[{value:`auto`,label:e.detected?Y(`settings.preset.auto`,{preset:Y(`settings.preset.${e.detected.preset}`)}):Y(`settings.preset.autoPending`)},...af(`settings.preset`,[`low`,`medium`,`high`,`ultra`]),...n.preset===`custom`?af(`settings.preset`,[`custom`]):[]];return[{kind:`choice`,id:`preset`,label:Y(`settings.preset`),value:n.preset,options:i},...n.preset===`auto`?[{kind:`button`,id:`redetect`,label:Y(`settings.detection`),action:Y(t.detecting?`settings.detecting`:`settings.redetect`),disabled:t.detecting}]:[],{kind:`heading`,id:`advanced`,label:Y(`settings.advanced`)},{kind:`slider`,id:`renderScale`,label:Y(`settings.renderScale`),value:n.renderScale,min:.5,max:1.25,step:.05},{kind:`toggle`,id:`nativePixelDensity`,label:Y(`settings.nativePixelDensity`),value:n.nativePixelDensity},{kind:`choice`,id:`frameLimit`,label:Y(`settings.frameLimit`),value:String(n.frameLimit),options:af(`settings.frameLimit`,[`screen`,`60`,`30`])},{kind:`choice`,id:`waterSimulation`,label:Y(`settings.waterSimulation`),value:n.waterSimulation,options:af(`settings.water`,[`auto`,`fast`,`accurate`]),nextWave:r(`waterSimulation`)},{kind:`choice`,id:`seaDetail`,label:Y(`settings.seaDetail`),value:n.seaDetail,options:af(`settings.sea`,[`standard`,`rich`]),nextWave:r(`seaDetail`)},{kind:`choice`,id:`waterLook`,label:Y(`settings.waterLook`),value:n.waterLook,options:af(`settings.waterLook`,[`classic`,`rich`])},{kind:`toggle`,id:`caustics`,label:Y(`settings.caustics`),value:n.caustics},{kind:`toggle`,id:`sprayMist`,label:Y(`settings.sprayMist`),value:n.sprayMist},{kind:`choice`,id:`particles`,label:Y(`settings.particles`),help:Y(`settings.particles.help`),value:n.particles,options:af(`settings.particles`,[`low`,`medium`,`high`])},{kind:`choice`,id:`oceanView`,label:Y(`settings.oceanView`),value:n.oceanView,options:af(`settings.ocean`,[`near`,`far`])},{kind:`choice`,id:`foam`,label:Y(`settings.foam`),value:n.foam,options:af(`settings.foam`,[`simple`,`detailed`])}]}function cf(e,t){let{bindings:n,handedness:r,trimStick:i,stickResponse:a,deadzoneSteam:o,deadzoneGamepad:s}=e.controls,c=t.steam??`unsupported`,l=t.padKind??`standard`,u=Y(`settings.deadzone.help`),d=[{kind:`heading`,id:`steamHeading`,label:Y(`settings.steam`)},{kind:`button`,id:`steamConnect`,label:Y(`settings.steam.connection`),help:Y(`settings.steam.help`),action:Y(c===`unsupported`?`settings.steam.unsupported`:c===`connected`?`settings.steam.connected`:`settings.steam.connect`),disabled:c!==`disconnected`},{kind:`heading`,id:`sticks`,label:Y(`settings.sticks`)},{kind:`choice`,id:`trimStick`,label:Y(`settings.trimStick`),value:i,options:af(`settings.trimStick`,[`right`,`left`])},{kind:`choice`,id:`stickResponse`,label:Y(`settings.stickResponse`),help:Y(`settings.stickResponse.help`),value:a,options:af(`settings.stickResponse`,[`linear`,`precise`])},{kind:`slider`,id:`deadzoneSteam`,label:Y(`settings.deadzoneSteam`),help:u,value:o,min:0,max:Ba,step:.01},{kind:`slider`,id:`deadzoneGamepad`,label:Y(`settings.deadzoneGamepad`),help:u,value:s,min:0,max:Ba,step:.01},{kind:`heading`,id:`buttons`,label:Y(`settings.buttons`)}];for(let e of ba){let t=Y(`action.${e}`),r=`action.${e}.help`,i=r in Ne?{help:Y(r)}:{};for(let r of[0,1]){let a=n.keyboard[e][r];d.push({kind:`binding`,id:`bind:keyboard:${e}:${r}`,label:t,...i,device:`keyboard`,action:e,slot:r,value:a?Na(a):`—`})}for(let r of[0,1])d.push({kind:`binding`,id:`bind:gamepad:${e}:${r}`,label:t,...i,device:`gamepad`,action:e,slot:r,value:Ia(n.gamepad[e][r],l)})}return d.push({kind:`choice`,id:`handedness`,label:Y(`settings.handedness`),value:r,options:af(`settings.hand`,[`right`,`left`])}),d}function lf(e,t,n){if(e===`gameplay`){let e=t.gameplay;return[{kind:`choice`,id:`units`,label:Y(`settings.units`),value:e.units,options:af(`settings.units`,[`metric`,`imperial`])},{kind:`choice`,id:`surfScale`,label:Y(`settings.surfScale`),value:e.surfScale,options:af(`settings.surfScale`,[`face`,`hawaiian`])},{kind:`choice`,id:`defaultCamera`,label:Y(`settings.defaultCamera`),value:e.defaultCamera,options:af(`view`,[`front`,`behind`,`side`,`overview`])},{kind:`choice`,id:`touchControls`,label:Y(`settings.touchControls`),value:e.touchControls,options:af(`settings.touch`,[`auto`,`on`,`off`])},{kind:`choice`,id:`balanceMeter`,label:Y(`settings.balanceMeter`),value:e.balanceMeter,options:af(`settings.balanceMeter`,[`practice`,`always`,`never`])},{kind:`choice`,id:`breathMeter`,label:Y(`settings.breathMeter`),value:e.breathMeter,options:af(`settings.breathMeter`,[`practice`,`always`,`never`])},{kind:`choice`,id:`pocketReflex`,label:Y(`settings.pocketReflex`),value:e.pocketReflex,options:af(`settings.pocketReflex`,[`practice`,`always`,`never`])},{kind:`choice`,id:`stance`,label:Y(`settings.stance`),value:e.stance,options:af(`settings.stance`,[`regular`,`goofy`])},{kind:`toggle`,id:`scoreRides`,label:Y(`settings.scoreRides`),value:e.scoreRides},{kind:`toggle`,id:`nameTags`,label:Y(`settings.nameTags`),value:e.nameTags},{kind:`toggle`,id:`stanceReadout`,label:Y(`settings.stanceReadout`),value:e.stanceReadout},...n.devTools?[{kind:`toggle`,id:`showTelemetry`,label:Y(`settings.showTelemetry`),value:e.showTelemetry}]:[]]}if(e===`graphics`)return sf(t,n);if(e===`controls`)return cf(t,n);if(e===`audio`){let e=t.audio;return[{kind:`slider`,id:`master`,label:Y(`settings.master`),value:e.master,min:0,max:1,step:.05},{kind:`slider`,id:`sea`,label:Y(`settings.sea`),value:e.sea,min:0,max:1,step:.05},{kind:`slider`,id:`board`,label:Y(`settings.boardRider`),value:e.board,min:0,max:1,step:.05},{kind:`slider`,id:`ui`,label:Y(`settings.interface`),value:e.ui,min:0,max:1,step:.05},{kind:`toggle`,id:`muteInBackground`,label:Y(`settings.muteInBackground`),value:e.muteInBackground}]}let r=t.accessibility;return[{kind:`toggle`,id:`reducedMotion`,label:Y(`settings.reducedMotion`),value:r.reducedMotion},{kind:`slider`,id:`uiScale`,label:Y(`settings.uiScale`),value:r.uiScale,min:.9,max:1.5,step:.05},{kind:`toggle`,id:`highContrastHud`,label:Y(`settings.highContrastHud`),value:r.highContrastHud},{kind:`toggle`,id:`monoAudio`,label:Y(`settings.monoAudio`),value:r.monoAudio}]}var uf=new Set([`units`,`surfScale`,`defaultCamera`,`touchControls`,`balanceMeter`,`breathMeter`,`pocketReflex`,`stance`,`scoreRides`,`nameTags`,`stanceReadout`,`showTelemetry`]),df=new Set([`reducedMotion`,`uiScale`,`highContrastHud`,`monoAudio`]),ff=new Set([`master`,`sea`,`board`,`ui`,`muteInBackground`]),pf=new Set([`handedness`,`trimStick`,`stickResponse`,`deadzoneSteam`,`deadzoneGamepad`]);function mf(e,t,n){if(uf.has(t))return{tab:`gameplay`,patch:{[t]:n}};if(df.has(t))return{tab:`accessibility`,patch:{[t]:n}};if(ff.has(t))return{tab:`audio`,patch:{[t]:n}};if(pf.has(t))return{tab:`controls`,patch:{[t]:n}};if(t===`preset`)return{tab:`graphics`,patch:ko(e.graphics,n,e.detected)};if(of.includes(t)){let r=t===`frameLimit`&&n!==`screen`?Number(n):n;return{tab:`graphics`,patch:Ao(e.graphics,{[t]:r})}}let r=/^bind:(keyboard|gamepad):(\w+):([01])$/.exec(t);if(r){let[,t,i,a]=r,o=e.controls.bindings,s=Aa(o,t,i,Number(a),n);return s===o?void 0:{tab:`controls`,patch:{bindings:s}}}}var hf=[`gameplay`,`graphics`,`controls`,`audio`,`accessibility`],gf=1;function _f(e){let{store:t}=e,n=`gameplay`,r=Q(`div`,{class:`settings-tabs`,attrs:{role:`tablist`}}),i=Q(`div`,{class:`settings-body`}),a=Q(`p`,{class:`settings-status`,attrs:{role:`status`}}),o=Q(`section`,{class:`screen screen-panel`,attrs:{"aria-label":Y(`settings.title`)}},Q(`div`,{class:`panel panel-settings`},Q(`header`,{class:`panel-header`},Q(`button`,{class:`icon-back`,attrs:{type:`button`,"aria-label":Y(`settings.back`)},dataset:{nav:``},on:{click:e.onBack}},pc(Wd.back)),Q(`h2`,{text:Y(`settings.title`)})),r,i,a,Q(`footer`,{class:`panel-footer`},Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``},text:Y(`settings.reset`),on:{click:()=>t.resetTab(n)}})))),s=(e,n)=>{let r=mf(t.value,e,n);if(!r){a.textContent=Y(`settings.cantBind`),u();return}a.textContent=``,t.update(r.tab,r.patch)},c=(t,n)=>{e.onCapture(!0),t.textContent=Y(n.device===`keyboard`?`settings.pressKey`:`settings.pressButton`),t.classList.add(`is-capturing`);let r=!1,i=t=>{r||(r=!0,window.removeEventListener(`keydown`,a,!0),e.onCapture(!1),t===void 0?u():s(n.id,t))},a=e=>{e.preventDefault(),e.stopImmediatePropagation(),e.code===`Escape`?i():n.device===`keyboard`&&i(e.code)};if(window.addEventListener(`keydown`,a,!0),n.device===`gamepad`){let n=e.pads??(()=>Ea()),a=new Set;for(let e of n())e.buttons.forEach((e,t)=>{e&&a.add(t)});let o=()=>{if(r||!t.isConnected)return i();for(let e of n()){let t=e.buttons.findIndex((e,t)=>e&&!a.has(t));if(t===gf)return i();if(t>=0)return i(t)}for(let e of[...a])n().some(t=>t.buttons[e])||a.delete(e);requestAnimationFrame(o)};requestAnimationFrame(o)}},l=t=>{if(t.kind===`choice`)return Q(`div`,{class:`segmented`,attrs:{role:`group`,"aria-label":t.label}},...t.options.map(e=>Q(`button`,{attrs:{type:`button`,"aria-pressed":String(e.value===t.value)},dataset:{nav:``,focusKey:`${t.id}:${e.value}`},text:e.label,on:{click:()=>s(t.id,e.value)}})));if(t.kind===`toggle`)return Q(`button`,{class:`switch`,attrs:{type:`button`,"aria-pressed":String(t.value),"aria-label":t.label},dataset:{nav:``,focusKey:t.id},text:Y(t.value?`settings.on`:`settings.off`),on:{click:()=>s(t.id,!t.value)}});if(t.kind===`slider`){let e=Q(`output`,{text:`${Math.round(t.value*100)} %`}),n=Q(`input`,{attrs:{type:`range`,min:String(t.min),max:String(t.max),step:String(t.step),value:String(t.value),"aria-label":t.label},dataset:{nav:``,focusKey:t.id},on:{input:()=>{e.textContent=`${Math.round(Number(n.value)*100)} %`},change:()=>s(t.id,Number(n.value))}});return Q(`div`,{class:`slider`},n,e)}if(t.kind===`button`){let n=Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``,focusKey:t.id},text:t.action,on:{click:()=>t.id===`steamConnect`?e.onSteamConnect?.():e.onRedetect()}});return n.disabled=t.disabled,n}return Q(`span`)},u=()=>{let s=document.activeElement?.dataset?.focusKey;r.replaceChildren(...hf.map(e=>Q(`button`,{class:`settings-tab`,attrs:{type:`button`,role:`tab`,"aria-selected":String(e===n)},dataset:{nav:``,focusKey:`tab:${e}`,...e===`gameplay`?{navDefault:``}:{}},text:Y(`settings.${e}`),on:{click:()=>{n=e,a.textContent=``,u()}}})));let d=lf(n,t.value,e.context()),f=[],p=!1;for(let e=0;e<d.length;e+=1){let t=d[e];if(t.kind===`heading`)f.push(Q(`h3`,{class:`panel-subhead`,text:t.label}));else if(t.kind===`binding`){p||(p=!0,f.push(Q(`div`,{class:`binding-row binding-head`},Q(`span`),Q(`span`,{text:Y(`settings.keyboard`)}),Q(`span`,{text:Y(`settings.gamepad`)}))));let n=d.slice(e,e+4);e+=3;let r=e=>{let t=Q(`button`,{class:`binding`,attrs:{type:`button`},dataset:{nav:``,focusKey:e.id},text:e.value});return t.addEventListener(`click`,()=>c(t,e)),t},i=t.help?Q(`small`,{class:`setting-help`,text:t.help}):null;f.push(Q(`div`,{class:`binding-row`},Q(`span`,{class:`setting-label`},t.label,i),Q(`span`,{class:`binding-keys`},r(n[0]),r(n[1])),Q(`span`,{class:`binding-keys`},r(n[2]),r(n[3]))))}else{let e=`nextWave`in t&&t.nextWave?Q(`span`,{class:`badge-inline`,text:Y(`settings.nextWave`)}):null,n=`help`in t&&t.help?Q(`small`,{class:`setting-help`,text:t.help}):null;f.push(Q(`div`,{class:`setting-row`},Q(`span`,{class:`setting-label`},t.label,e,n),l(t)))}}i.replaceChildren(...f),s&&o.querySelector(`[data-focus-key="${CSS.escape(s)}"]`)?.focus({preventScroll:!0})},d=t.subscribe(u),f=e.external?.(u);return u(),{root:o,dispose:()=>{d(),f?.()}}}function vf(e){return[{id:`surf`,label:`menu.surf`,icon:`surf`,disabled:!1},{id:`school`,label:`menu.school`,icon:`school`,disabled:!1,...e?{}:{badge:`menu.startHere`}},{id:`waveLab`,label:`menu.waveLab`,icon:`waveLab`,disabled:!1},{id:`multiplayer`,label:`menu.multiplayer`,icon:`multiplayer`,disabled:!1},{id:`logbook`,label:`menu.logbook`,icon:`logbook`,disabled:!1},{id:`settings`,label:`menu.settings`,icon:`settings`,disabled:!1}]}function yf(e,t){if(!(t||e===`connected`))return e===`unsupported`?{label:`menu.steamUnsupported`,disabled:!0}:{label:`menu.steamConnect`,disabled:!1}}function bf(){if(!document.fullscreenEnabled)return null;let e=Q(`span`),t=Q(`button`,{class:`strip-button`,attrs:{type:`button`},dataset:{nav:``},on:{click:()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}}},pc(Wd.fullscreen),e),n=()=>{e.textContent=Y(document.fullscreenElement?`menu.exitFullscreen`:`menu.fullscreen`)};return document.addEventListener(`fullscreenchange`,n),n(),t}function xf(e,t,n){return Q(`button`,{class:e,attrs:{type:`button`,"aria-pressed":String(!t)},dataset:{nav:``,soundToggle:``},on:{click:n}},pc(Wd[t?`muted`:`sound`]),Q(`span`,{class:`sound-label`,text:Y(t?`menu.muted`:`menu.sound`)}))}function Sf(e,t){for(let n of e.querySelectorAll(`[data-sound-toggle]`)){n.setAttribute(`aria-pressed`,String(!t)),n.querySelector(`svg`)?.replaceWith(pc(Wd[t?`muted`:`sound`]));let e=n.querySelector(`.sound-label`);e&&(e.textContent=Y(t?`menu.muted`:`menu.sound`))}}function Cf(e,t){let n=vf(t.schoolStarted).map(t=>Q(`button`,{class:t.id===`surf`?`tile tile-primary`:`tile`,attrs:{type:`button`,...t.disabled?{"aria-disabled":`true`}:{}},dataset:t.id===`surf`?{nav:``,navDefault:``}:{nav:``},on:{click:()=>{t.disabled||e[t.id]()}}},t.badge?Q(`span`,{class:`badge`,text:Y(t.badge)}):null,pc(Wd[t.icon]),Q(`span`,{text:Y(t.label)})));return Q(`section`,{class:`screen screen-menu`,attrs:{"aria-label":Y(`app.name`)}},Q(`div`,{class:`brand-block`},Q(`span`,{class:`brand-mark`,text:`B`,attrs:{"aria-hidden":`true`}}),Q(`h1`,{class:`wordmark`,text:Y(`app.name`)}),Q(`p`,{class:`tagline`,text:Y(`app.tagline`)})),Q(`nav`,{class:`tiles`,attrs:{"aria-label":Y(`menu.title`)}},...n),Q(`div`,{class:`menu-strip`},Q(`span`,{class:`strip-group`},bf()??Q(`span`),xf(`strip-button`,t.sound.muted,t.sound.toggle),t.steam?Q(`button`,{class:`strip-button`,attrs:{type:`button`,...t.steam.disabled?{"aria-disabled":`true`}:{}},dataset:{nav:``},text:t.steam.label,on:{click:()=>{t.steam?.disabled||t.steam?.connect()}}}):null),Q(`span`,{text:Y(`menu.version`,{version:t.version})})))}var wf=2;function Tf(e,t,n){let r=e[t];if(!r)return t;let i=r.x+r.width/2,a=r.y+r.height/2,o=t,s=1/0;return e.forEach((e,r)=>{if(r===t)return;let c=e.x+e.width/2-i,l=e.y+e.height/2-a,u=n===`left`?-c:n===`right`?c:n===`up`?-l:l,d=Math.abs(n===`left`||n===`right`?l:c);if(u<=.5)return;let f=u+wf*d;f<s&&(s=f,o=r)}),o}var Ef={ArrowUp:`up`,ArrowDown:`down`,ArrowLeft:`left`,ArrowRight:`right`},Df=[[12,`up`],[13,`down`],[14,`left`],[15,`right`]],Of=0,kf=1,Af=180,jf=.55;function Mf(e){for(let t of e){for(let[e,n]of Df)if(t.buttons[e])return n;let[e=0,n=0]=t.axes;if(Math.abs(e)>jf||Math.abs(n)>jf)return Math.abs(e)>Math.abs(n)?e>0?`right`:`left`:n>0?`down`:`up`}}var Nf=class{options;active=!0;previous=new Set;held;repeatAt=0;constructor(e){this.options=e,(e.target??window).addEventListener(`keydown`,e=>this.keyDown(e))}focusDefault(){(this.options.root()?.querySelector(`[data-nav-default]:not([disabled])`)??this.items()[0])?.focus({preventScroll:!0})}poll(e=performance.now()){let t=(this.options.pads??(()=>Ea()))(),n=new Set;for(let e of t)e.buttons.forEach((e,t)=>{e&&n.add(t)});let r=Mf(t);this.active&&(n.has(Of)&&!this.previous.has(Of)&&this.focused()?.click(),n.has(kf)&&!this.previous.has(kf)&&this.options.onBack(),r&&(r!==this.held||e>=this.repeatAt)&&(this.move(r),this.repeatAt=e+(r===this.held?Af:360))),this.held=r,this.previous=n}keyDown(e){if(!this.active||e.defaultPrevented)return;if(e.code===`Escape`){e.preventDefault(),this.options.onBack();return}let t=Ef[e.code];if(!t)return;let n=e.target;(n?.tagName!==`INPUT`||n.type!==`range`||t!==`left`&&t!==`right`)&&(e.preventDefault(),this.move(t))}items(){let e=this.options.root();return e?[...e.querySelectorAll(`[data-nav]:not([disabled])`)].filter(e=>e.getClientRects().length>0):[]}focused(){let e=document.activeElement;return e&&this.options.root()?.contains(e)?e:void 0}move(e){let t=this.items(),n=t.indexOf(document.activeElement);if(n<0){this.focusDefault();return}let r=t[Tf(t.map(e=>e.getBoundingClientRect()),n,e)];r.focus({preventScroll:!0}),r.scrollIntoView({block:`nearest`,inline:`nearest`})}};function Pf(e,t,n){let r=(e,t,n=!1)=>Q(`button`,{class:`pause-item`,attrs:{type:`button`},dataset:n?{nav:``,navDefault:``}:{nav:``},text:e,on:{click:t}}),i=r(Y(`pause.camera`,{view:t}),()=>{i.textContent=Y(`pause.camera`,{view:e.camera()})});return Q(`section`,{class:`screen screen-panel screen-pause`,attrs:{"aria-label":Y(`pause.title`)}},Q(`div`,{class:`panel panel-narrow`},Q(`h2`,{class:`pause-title`,text:Y(`pause.title`)}),Q(`div`,{class:`pause-items`},r(Y(`pause.resume`),e.resume,!0),i,r(Y(`pause.settings`),e.settings),xf(`pause-item`,e.sound.muted,e.sound.toggle),r(Y(`online.leave`),e.leave)),n))}function Ff(e,t,n){let r=(e,t,n=!1)=>Q(`button`,{class:`pause-item`,attrs:{type:`button`},dataset:n?{nav:``,navDefault:``}:{nav:``},text:e,on:{click:t}}),i=r(Y(`pause.camera`,{view:t}),()=>{i.textContent=Y(`pause.camera`,{view:e.camera()})});return Q(`section`,{class:`screen screen-panel screen-pause`,attrs:{"aria-label":Y(`pause.title`)}},Q(`div`,{class:`panel panel-narrow`},Q(`h2`,{class:`pause-title`,text:Y(`pause.title`)}),n?Q(`p`,{class:`pause-note`,text:Y(`pause.surf`,{surf:n})}):void 0,Q(`div`,{class:`pause-items`},r(Y(`pause.resume`),e.resume,!0),r(Y(`pause.replay`),e.replay),r(Y(`pause.newWave`),e.newWave),i,r(Y(`pause.settings`),e.settings),xf(`pause-item`,e.sound.muted,e.sound.toggle),r(Y(`pause.quit`),e.quit))))}function If(e){let t=(e,t,n=!1)=>Q(`button`,{class:`pause-item`,attrs:{type:`button`},dataset:n?{nav:``,navDefault:``}:{nav:``},text:e,on:{click:t}});return Q(`section`,{class:`screen screen-panel screen-pause`,attrs:{"aria-label":Y(`pause.title`)}},Q(`div`,{class:`panel panel-narrow`},Q(`h2`,{class:`pause-title`,text:Y(`pause.title`)}),Q(`div`,{class:`pause-items`},t(Y(`pause.resume`),e.resume,!0),t(Y(`pause.settings`),e.settings),xf(`pause-item`,e.sound.muted,e.sound.toggle),t(Y(`pause.quit`),e.quit))))}function Lf(e,t){let n=(e,t,n=!1)=>Q(`button`,{class:`pause-item`,attrs:{type:`button`},dataset:n?{nav:``,navDefault:``}:{nav:``},text:e,on:{click:t}}),r=e=>Y(`school.slowMotion`,{state:Y(e?`school.on`:`school.off`)}),i=n(r(e.slowMotionOn),()=>{i.textContent=r(e.slowMotion())}),a=n(Y(`pause.camera`,{view:t}),()=>{a.textContent=Y(`pause.camera`,{view:e.camera()})});return Q(`section`,{class:`screen screen-panel screen-pause`,attrs:{"aria-label":Y(`pause.title`)}},Q(`div`,{class:`panel panel-narrow`},Q(`h2`,{class:`pause-title`,text:Y(`pause.title`)}),Q(`div`,{class:`pause-items`},n(Y(`pause.resume`),e.resume,!0),n(Y(`school.restart`),e.restart),e.howTo?n(Y(`school.howTo`),e.howTo):n(Y(`school.explain`),e.explain),i,a,n(Y(`pause.settings`),e.settings),xf(`pause-item`,e.sound.muted,e.sound.toggle),n(Y(`school.list`),e.lessons),n(Y(`pause.quit`),e.quit))))}var Rf={pocket:25,caught:12,waiting:15,inside:15},zf=40,Bf=2,Vf=3,Hf=class{lesson;state=`card`;misses=0;goal={progress:0,passed:!1};cause;tracker;time=0;missedFor=0;seenReport;limit;stood=!1;constructor(e,t={}){this.lesson=e;let n=e?.start??t.start??`pocket`;this.limit=!e&&n===`pocket`?zf:Rf[n]}start(){this.state=`attempt`,this.tracker=this.lesson?.goal(),this.goal={progress:0,passed:!1},this.time=0,this.missedFor=0,this.cause=void 0,this.seenReport=void 0,this.stood=!1}frame(e){if(this.state!==`attempt`)return;if(this.time+=e.dt,e.phase===`standing`&&(this.stood=!0),this.tracker&&(this.goal=this.tracker.update(e)),this.goal.passed){this.state=`passed`,this.misses=0;return}if(this.goal.missed){this.miss(this.goal.missed);return}let t=e.report?.id??-1;this.seenReport===void 0&&(this.seenReport=t),e.phase===`fallen`?this.miss(uu[e.separation??`balance`]):e.report&&t!==this.seenReport?this.miss(e.report.end===`fell`?uu[e.separation??`balance`]:du[e.report.end]):this.time>=(!this.lesson&&this.stood?Math.max(this.limit,zf):this.limit)&&this.miss(`school.miss.time`)}tick(e){if(this.state===`missed`&&(this.missedFor+=e,!(this.missedFor<Bf)))return this.lesson&&this.misses>=Vf?(this.misses=0,this.state=`card`,`card`):`restart`}retry(){return this.state===`attempt`||this.state===`missed`}showCard(){this.state=`card`}miss(e){this.state=`missed`,this.cause=e,this.missedFor=0,this.lesson&&(this.misses+=1)}},Uf=8*Math.PI/180,Wf=.3,Gf=.5,Kf=1,qf=.5,Jf=3,Yf=.6,Xf=.2,Zf=8,Qf=.5,$f=.5,ep=.5,tp=.35,np=.2,rp=1,ip=1,ap=2,op=5,sp=.4,cp=.3,lp=2,up=.3,dp=3,fp=e=>Math.atan2(Math.sin(e),Math.cos(e)),pp=class{done=new Set;side=0;from=0;update(e){let t=e.phase===`standing`&&Math.abs(e.input.steer)>=Wf?Math.sign(e.input.steer):0;return t===this.side?t!==0&&Math.abs(fp(e.heading-this.from))>=Uf&&this.done.add(t):(this.side=t,this.from=e.heading),{progress:this.done.size/2,passed:this.done.size===2,count:{done:this.done.size,of:2}}}},mp=class{stage=0;held=0;from=0;update(e){let t=this.stage===0?1:-1;return e.phase===`standing`&&e.input.trim*t>=Gf?(this.held===0&&(this.from=e.speed),this.held+=e.dt,this.held>=Kf&&(e.speed-this.from)*t>=qf&&(this.stage+=1,this.held=0)):this.held=0,{progress:this.stage/2,passed:this.stage>=2,count:{done:Math.min(2,this.stage),of:2}}}},hp=class{pumps=0;low=!1;since=0;startSpeed=0;passed=!1;update(e){return!this.passed&&e.phase===`standing`&&(this.since+=e.dt,this.pumps>0&&this.since>Zf&&(this.pumps=0),!this.low&&e.input.crouch>=Yf?(this.low=!0,this.pumps===0&&(this.since=0,this.startSpeed=e.speed)):this.low&&e.input.crouch<=Xf&&(this.low=!1,this.pumps+=1,this.pumps>=Jf&&(e.speed>=this.startSpeed?this.passed=!0:this.pumps=0))),{progress:this.passed?1:this.pumps/Jf,passed:this.passed,count:{done:this.passed?Jf:this.pumps,of:Jf}}}},gp=class{kinds;passed=!1;constructor(e){this.kinds=e}update(e){return e.live&&this.kinds.includes(e.live.kind)&&(this.passed=!0),{progress:+!!this.passed,passed:this.passed}}},_p=class{stage=0;named=!1;before=-1/0;face=NaN;passed=!1;update(e){if(!this.passed){if(e.phase!==`standing`||!e.wave.valid)this.stage=0,this.named=!1,this.before=-1/0,this.face=NaN;else{let{input:t}=e,n=e.wave.faceFraction,r=n<this.face,i=n>this.face;this.face=n,this.stage===0&&r&&t.crouch>=Qf&&t.compress<np?(this.stage=1,this.before=e.live?.start??-1/0):this.stage===1&&t.compress>=$f?this.stage=n<=tp&&Math.abs(t.steer)>=ep?2:n>tp?0:1:this.stage===2&&i&&t.compress<np&&(this.stage=3),this.stage>=1&&e.live?.kind===`bottom turn`&&e.live.start>this.before&&(this.named=!0),this.passed=this.stage===3&&this.named}}return{progress:this.passed?1:Math.min(.99,this.stage/3),passed:this.passed,count:{done:this.passed?3:this.stage,of:3}}}},vp=class{held=0;speed=0;ahead=0;passed=!1;update(e){return e.phase===`standing`&&e.input.hand&&e.wave.valid?this.passed||(this.held===0&&(this.speed=e.speed,this.ahead=e.wave.aheadOfCrest),this.held+=e.dt,this.held>=rp&&this.speed-e.speed>=ip&&this.ahead-e.wave.aheadOfCrest>=ap&&(this.passed=!0)):this.held=0,{progress:this.passed?1:Math.min(.99,this.held/rp),passed:this.passed}}},yp=class{time=0;update(e){let{wave:t}=e;e.phase===`standing`&&t.valid&&t.faceFraction>=sp&&t.crestBreaking>=cp&&(this.time+=e.dt);let n=this.time>=4.999999999;return{progress:Math.min(1,this.time/op),passed:n,count:{done:Math.min(op,Math.floor(this.time)),of:op,seconds:!0}}}},bp=class{time=0;passed=!1;update(e){return this.time=e.phase===`standing`?this.time+e.dt:0,this.time>=1.999999999&&(this.passed=!0),{progress:this.passed?1:Math.min(.99,this.time/lp),passed:this.passed}}},xp=class{armed=!1;from=0;fell=!1;update(e){let t=e.seaward??{x:0,z:-1},n=(e.x??0)*t.x+(e.z??0)*t.z,r=e.wave.valid&&e.wave.crestBreaking>=up&&e.wave.aheadOfCrest>0;if(!this.armed&&r&&(this.armed=!0,this.from=n),!this.armed)return{progress:0,passed:!1};if(this.from=Math.max(this.from,n),e.phase===`fallen`&&(this.fell=!0),this.from-n>dp)return{progress:.5,passed:!1,missed:`lesson.duckDive.pushed`};let i=e.wave.valid&&e.wave.aheadOfCrest<0;return{progress:i?1:.5,passed:i&&!this.fell}}},Sp=[`steerLeft`,`steerRight`],Cp=[{id:`lean`,start:`pocket`,view:`behind`,actions:Sp,goal:()=>new pp,hint:`lean`},{id:`trim`,start:`pocket`,view:`side`,actions:[`trimForward`,`trimBack`],goal:()=>new mp,hint:`trim`},{id:`crouch`,start:`pocket`,view:`side`,actions:[`crouch`],goal:()=>new hp,hint:`crouch`},{id:`bottomTurn`,start:`pocket`,view:`front`,actions:[...Sp,`crouch`,`compress`],goal:()=>new _p},{id:`topTurn`,start:`pocket`,view:`front`,actions:[...Sp,`trimBack`],goal:()=>new gp([`top turn`,`snap`])},{id:`hand`,start:`pocket`,view:`behind`,actions:[`hand`],goal:()=>new vp,hint:`hand`},{id:`pocket`,start:`pocket`,view:`behind`,actions:[`trimForward`,`trimBack`,...Sp],goal:()=>new yp},{id:`popUp`,start:`caught`,view:`front`,actions:[`popUp`],goal:()=>new bp},{id:`catch`,start:`waiting`,view:`front`,actions:[`paddle`,`popUp`],goal:()=>new bp},{id:`duckDive`,start:`inside`,view:`front`,actions:[`paddle`,`duckDive`],goal:()=>new xp,hint:`duckDive`}];function wp(e){let t=Cp.find(t=>t.id===e);if(!t)throw Error(`No lesson ${e}`);return t}var Tp=`breakline.school.v1`,Ep=new Set(Cp.map(e=>e.id)),Dp=class{storage;done=new Set;constructor(e){this.storage=e;try{let t=JSON.parse(e?.getItem(`breakline.school.v1`)??`[]`);if(Array.isArray(t))for(let e of t)typeof e==`string`&&Ep.has(e)&&this.done.add(e)}catch{}}passed(e){return this.done.has(e)}pass(e){if(!this.done.has(e)){this.done.add(e);try{this.storage?.setItem(Tp,JSON.stringify([...this.done]))}catch{}}}get count(){return this.done.size}get started(){return this.done.has(Cp[0].id)}};function Op(e,t,n){let r=e.rows.map((e,n)=>Q(`button`,{class:e.passed?`lesson-row is-passed`:`lesson-row`,attrs:{type:`button`,...e.passed?{"aria-label":`${e.title}, ${Y(`school.passed`)}`}:{}},dataset:n===0?{nav:``,navDefault:``}:{nav:``},on:{click:()=>t.lesson(e.id)}},Q(`span`,{class:`lesson-number`,text:String(e.number)}),Q(`span`,{class:`lesson-text`},Q(`strong`,{text:e.title}),Q(`small`,{text:e.blurb})),Q(`span`,{class:`lesson-check`,text:e.passed?`✓`:``,attrs:{"aria-hidden":`true`}}))),i=(e,n)=>Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``},text:Y(n),on:{click:()=>t.freePractice(e)}});return Q(`section`,{class:`screen screen-panel`,attrs:{"aria-label":Y(`school.title`)}},Q(`div`,{class:`panel panel-school`},Q(`header`,{class:`panel-header`},Q(`button`,{class:`icon-back`,attrs:{type:`button`,"aria-label":Y(`surf.back`)},dataset:{nav:``},on:{click:t.back}},pc(Wd.back)),Q(`h2`,{text:Y(`school.title`)})),Q(`p`,{class:`panel-lead`,text:Y(`school.lead`)}),n?Q(`p`,{class:`online-message`,attrs:{role:`alert`},text:n}):null,Q(`p`,{class:`panel-subhead`,text:e.progress}),Q(`div`,{class:`lesson-rows`},...r),Q(`div`,{class:`free-practice`},Q(`div`,{class:`lesson-text`},Q(`strong`,{text:Y(`school.freePractice`)}),Q(`small`,{text:Y(`school.freePractice.blurb`)})),Q(`div`,{class:`free-practice-starts`},i(`pocket`,`school.start.pocket`),i(`waiting`,`school.start.waiting`)))))}var kp=e=>`<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,Ap=`<path d="M4 70 C 34 70 56 64 72 44 C 82 30 94 20 106 22 C 114 24 116 32 110 36" opacity=".45"/>`,jp=(e,t,n)=>{let r=n*Math.PI/180,i=(n,i)=>`${(e-7*Math.cos(r+i*n)).toFixed(1)} ${(t-7*Math.sin(r+i*n)).toFixed(1)}`;return`<path d="M${i(.5,1)} L${e} ${t} L${i(.5,-1)}"/>`},Mp=(e,t,n=0)=>{let r=t-14+5*n,i=r-12;return`<path d="M${e-14} ${t} L${e+14} ${t}"/><path d="M${e-6} ${t-1} L${e-3-3*n} ${r+6} L${e} ${r} L${e+3+3*n} ${r+6} L${e+6} ${t-1}"/><path d="M${e} ${r} L${e} ${i}"/><circle cx="${e}" cy="${i-4}" r="3.5"/><path d="M${e-11} ${i+4} L${e} ${i+1} L${e+11} ${i+4}"/>`},Np=(e,t)=>`<path d="M${e-16} ${t} L${e+16} ${t}"/><path d="M${e-12} ${t-4} L${e+6} ${t-4}"/><circle cx="${e+10}" cy="${t-6}" r="3.5"/>`,Pp={lean:kp(`<path d="M44 58 L76 50"/><path d="M60 54 L60 30"/><circle cx="60" cy="25" r="4"/><path d="M40 40 C 30 36 24 28 24 18"/>`+jp(24,18,-90)+`<path d="M80 40 C 90 36 96 28 96 18"/>`+jp(96,18,-90)),trim:kp(`<path d="M14 56 C 40 60 80 60 106 52"/><circle cx="60" cy="40" r="5"/><path d="M66 40 L88 40"/>`+jp(88,40,0)+`<path d="M54 40 L32 40"/>`+jp(32,40,180)+`<path d="M88 66 L100 66" opacity=".6"/><path d="M20 66 L26 66" opacity=".6"/>`),crouch:kp(`${Mp(34,64,1)}${Mp(86,64,0)}<path d="M50 30 C 58 22 64 22 70 30"/>${jp(70,30,50)}`),bottomTurn:kp(`${Ap}<path d="M76 34 C 64 52 50 66 36 64 C 26 62 30 50 40 42"/>${jp(40,42,-40)}`),topTurn:kp(`${Ap}<path d="M40 64 C 56 56 72 40 84 26 C 92 18 98 26 90 36 C 84 44 72 52 60 58"/>${jp(60,58,150)}`),hand:kp(`${Ap}${Mp(60,56,.6)}<path d="M71 43 L78 52" /><path d="M80 56 C 86 58 92 58 96 56" opacity=".6"/><path d="M104 30 C 98 38 92 44 84 46"/>${jp(84,46,160)}`),pocket:kp(`${Ap}<path d="M92 20 C 100 12 112 16 112 26" opacity=".45"/><rect x="72" y="26" width="24" height="22" rx="4" stroke-dasharray="3 4"/>`+Mp(84,44,.3)),popUp:kp(`${Np(28,58)}<path d="M50 50 L66 50"/>${jp(66,50,0)}${Mp(90,62,.4)}`),catch:kp(`<path d="M4 64 C 20 64 30 58 38 46 C 44 38 50 34 56 36" opacity=".45"/>${Np(80,60)}<path d="M72 64 C 70 70 64 72 60 70"/><path d="M84 64 C 82 70 76 72 72 70"/><path d="M98 50 L112 50"/>${jp(112,50,0)}`),duckDive:kp(`<path d="M4 38 L116 38" opacity=".45"/><path d="M6 38 C 10 26 22 22 30 30 C 34 34 36 38 40 38"/><circle cx="18" cy="31" r="2"/><circle cx="26" cy="27" r="1.5"/><path d="M52 60 L84 52"/><path d="M58 54 L66 44 M66 44 L72 50 L84 48"/><circle cx="62" cy="41" r="3.5"/><path d="M34 24 C 56 16 78 16 100 24"/>${jp(100,24,20)}`)};function Fp(e){let t=document.createElement(`template`);return t.innerHTML=Pp[e],t.content.firstElementChild}function Ip(e){return[Q(`p`,{class:`panel-subhead`,text:Y(`school.lesson`,{n:e.number})}),Q(`h2`,{class:`lesson-title`,text:e.title}),Q(`div`,{class:`lesson-diagram`},Fp(e.diagram)),Q(`p`,{class:`lesson-explain`,text:e.explain}),Q(`p`,{class:`lesson-keys`},Q(`span`,{text:Y(`school.keys`)}),Q(`span`,{class:`keycap`,text:e.keys}))]}function Lp(e,t,n=`school.go`){return Q(`section`,{class:`screen screen-panel screen-lesson-card`,attrs:{"aria-label":e.title}},Q(`div`,{class:`panel panel-narrow panel-lesson`},...Ip(e),Q(`div`,{class:`panel-footer`},t.list?Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``},text:Y(`school.list`),on:{click:t.list}}):null,Q(`button`,{class:`button-primary`,attrs:{type:`button`},dataset:{nav:``,navDefault:``},text:Y(n),on:{click:t.go}}))))}function Rp(e,t){let n=(e,t,n=!1)=>Q(`button`,{class:n?`button-primary`:`button-secondary`,attrs:{type:`button`},dataset:n?{nav:``,navDefault:``}:{nav:``},text:Y(e),on:{click:t}});return Q(`aside`,{class:`end-card lesson-pass`,attrs:{role:`status`}},Q(`div`,{class:`end-card-head`},Q(`div`,{},Q(`h2`,{text:Y(`school.passed`)}),Q(`p`,{class:`end-card-reason`,text:e}))),Q(`div`,{class:`end-card-actions`},t.next?n(`school.next`,t.next,!0):null,n(`school.again`,t.again,!t.next),n(`school.list`,t.list)))}function zp(e,t){let n=Q(`div`,{class:`how-to-detail`}),r=e=>n.replaceChildren(...Ip(e));return r(e[0]),Q(`section`,{class:`screen screen-panel`,attrs:{"aria-label":Y(`school.howTo`)}},Q(`div`,{class:`panel panel-how-to`},Q(`div`,{class:`how-to-list`},...e.map(e=>Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``},text:e.title,on:{click:()=>r(e)}}))),n,Q(`div`,{class:`panel-footer`},Q(`button`,{class:`button-primary`,attrs:{type:`button`},dataset:{nav:``,navDefault:``},text:Y(`school.close`),on:{click:t}}))))}var Bp=(e,t,n)=>Y(`lesson.${e}.${t}`,n),Vp=[[`steerLeft`,`steerRight`],[`trimForward`,`trimBack`]];function Hp(e,t){let n=[],{actions:r}=e;for(let e=0;e<r.length;e+=1){let i=Vp.find(([t,n])=>r[e]===t&&r[e+1]===n);if(i){let[r,a]=[t(i[0]),t(i[1])];n.push(r===a?r:`${r} ${a}`),e+=1}else n.push(t(r[e]))}return[...new Set(n)].join(` · `)}function Up(e,t){return{rows:t.map((t,n)=>({id:t.id,number:n+1,title:Bp(t.id,`title`),blurb:Bp(t.id,`blurb`),passed:e.passed(t.id)})),progress:Y(`school.progress`,{done:e.count,total:t.length})}}function Wp(e,t){return{number:Cp.indexOf(e)+1,title:Bp(e.id,`title`),explain:Bp(e.id,`explain`),diagram:e.id,keys:Hp(e,t)}}function Gp(e,t,n){let{lesson:r}=e,i=Y(`school.againSoon`,{retry:n});if(e.state===`missed`){let t=e.cause?Y(e.cause):``;return{prompt:r?Y(`school.missed`,{cause:t,tip:Bp(r.id,`tip`)}):t,coach:i}}if(!r)return{prompt:void 0,coach:Y(`school.freeRide`,{retry:n})};if(e.state!==`attempt`)return{prompt:``,coach:``};let{count:a}=e.goal,o=a?Y(a.seconds?`school.countSeconds`:`school.count`,{done:a.done,of:a.of}):``;return{prompt:Bp(r.id,`prompt`,{keys:Hp(r,t)}),coach:o}}function Kp(e){let t=Q(`p`,{class:`sound-check-note`,text:`Click anywhere first: browsers start sound only after a click or key.`}),n=[`master`,`sea`,`board`,`ui`].map(t=>{let n=Q(`input`,{attrs:{type:`range`,min:`0`,max:`1`,step:`0.05`,value:`1`}}),r=Q(`output`,{text:`100 %`});return n.addEventListener(`input`,()=>{r.textContent=`${Math.round(Number(n.value)*100)} %`,e()?.setBusLevel(t,Number(n.value))}),Q(`label`,{class:`slider-row`},Q(`span`,{},`${t} bus `,r),n)}),r=gu.map(t=>qp(t,e));return Q(`aside`,{class:`sound-check`,attrs:{"aria-label":`Sound check`}},Q(`h2`,{text:`Sound check`}),t,...n,...r)}function qp(e,t){let n=()=>t()?.soundBank,r=()=>n()?.manifest.sounds[e],i=Q(`input`,{attrs:{type:`range`,min:`0`,max:`2`,step:`0.05`,value:String(r()?.gain??1)}}),a=Q(`code`),o=r()?.chosen??0,s=()=>{a.textContent=`"${e}": { "chosen": ${o}, "gain": ${Number(i.value)} }`};i.addEventListener(`input`,s);let c=(e,n,r,a=()=>1)=>Q(`button`,{class:`button button-quiet`,attrs:{type:`button`},text:e,on:{click:async()=>{let e=t(),c=await n();e&&c&&e.audition(c,Number(i.value)*a()),r!==void 0&&(o=r,s())}}}),l=r()?.candidates??[];return s(),Q(`div`,{class:`sound-check-row`},Q(`strong`,{text:`${e}${n()?.recorded(e)?` · recorded`:` · synthesised`}`}),Q(`div`,{class:`panel-actions`},c(`synth`,async()=>{let n=t();if(!n)return;let r=Mu(e,n.context.sampleRate),i=n.context.createBuffer(1,r.length,n.context.sampleRate);return i.copyToChannel(r,0),i}),...l.map((t,r)=>c(t.variants?.length?`${t.author} (×${1+t.variants.length})`:t.author,async()=>n()?.candidate(e,r),r,()=>n()?.candidateLevel(e,r)??1))),Q(`label`,{class:`slider-row`},Q(`span`,{text:`gain`}),i),a)}var Jp=[.1,.25,.5,1],Yp=class{paused=!1;scale=1;pending=0;togglePause(){this.paused=!this.paused,this.pending=0}step(){this.paused&&(this.pending+=1)}setScale(e){this.scale=Jp.reduce((t,n)=>Math.abs(n-e)<Math.abs(t-e)?n:t,1)}slower(){this.scale=Jp[Math.max(0,this.index()-1)]}faster(){this.scale=Jp[Math.min(Jp.length-1,this.index()+1)]}advance(e){if(this.paused){let e=this.pending;return this.pending=0,e*x}return e>0?e*this.scale:0}index(){let e=Jp.indexOf(this.scale);return e>=0?e:Jp.length-1}},Xp=`breakline.wavelab.v1`;function Zp(){return{physical:{...qt,spot:`canyon`,source:`practice`},water:`graphics`,...St.midday,waterLook:`rich`}}var Qp=e=>typeof e==`object`&&e&&!Array.isArray(e)?e:{},$p=(e,t,n)=>t.includes(e)?e:n,em=(e,t,n,r)=>typeof e==`number`&&Number.isFinite(e)?Math.min(n,Math.max(t,e)):r;function tm(e){let t=Zp(),n=Qp(e),r=Qp(n.physical),i=t.physical;return{physical:{spot:$p(r.spot,Pe,i.spot),stage:$p(r.stage,[1,2],i.stage),compute:$p(r.compute,[`auto`,`cpu`],i.compute),source:$p(r.source,[`buoy`,`storm`,`practice`],i.source),significantHeight:em(r.significantHeight,Ut.height.min,Ut.height.max,i.significantHeight),peakPeriod:em(r.peakPeriod,Ut.period.min,Ut.period.max,i.peakPeriod),directionDegrees:em(r.directionDegrees,-40,40,i.directionDegrees),spread:em(r.spread,0,1,i.spread),tide:em(r.tide,-1,1,i.tide),windSpeed:em(r.windSpeed,-12,12,i.windSpeed),stormWindSpeed:em(r.stormWindSpeed,8,30,i.stormWindSpeed),stormFetchKm:em(r.stormFetchKm,50,2e3,i.stormFetchKm),stormDurationHours:em(r.stormDurationHours,3,96,i.stormDurationHours),stormDistanceKm:em(r.stormDistanceKm,0,1e4,i.stormDistanceKm)},water:$p(n.water,[`graphics`,`chosen`],t.water),sunHeight:em(n.sunHeight,0,1,t.sunHeight),sunDirection:em(n.sunDirection,-180,180,t.sunDirection),waterLook:$p(n.waterLook,[`classic`,`rich`],t.waterLook)}}function nm(e,t){return e.water!==t.water||Object.keys(e.physical).some(n=>e.physical[n]!==t.physical[n])}function rm(e,t,n){return n&&e.water===`chosen`?{stage:e.physical.stage,compute:e.physical.compute}:{...t}}function im(e){return Object.keys(St).find(t=>Math.abs(St[t].sunHeight-e.sunHeight)<1e-6&&Math.abs(St[t].sunDirection-e.sunDirection)<1e-6)??`custom`}var am=class{storage;current;constructor(e){this.storage=e;let t;try{t=JSON.parse(e?.getItem(`breakline.wavelab.v1`)??`null`)}catch{t=null}this.current=t?tm(t):Zp()}get value(){return this.current}save(e){this.current=tm(e);try{this.storage?.setItem(Xp,JSON.stringify(this.current))}catch{}}};function om(e,t){return e===0?Y(`lab.wind.calm`):Y(e<0?`lab.wind.offshore`:`lab.wind.onshore`,{speed:Yd(Math.abs(e),t)})}function sm(e){return Y(e<.34?`lab.spread.groundswell`:e<.67?`lab.spread.mixed`:`lab.spread.windswell`)}function cm(e,t){let n=c(e);return Y(`lab.stormArrives`,{height:Xd(n.significantHeight,t),period:Math.round(n.peakPeriod)})}function lm(e,t){let n=_e(t);return Y(`lab.practiceNote`,{height:Xd(n.significantHeight,e),period:n.peakPeriod,direction:n.directionDegrees??0})}function um(e,t,n){let{typical:r,sets:i}=wt(e.spot,e.significantHeight,e.peakPeriod);return Y(`lab.surfForecast`,{surf:Ze(r,i,t,n)})}function dm(e,t){let n=(t,n,r,i,a,o)=>({key:t,group:`swell`,label:n,min:r,max:i,step:a,value:e[t],text:o}),r=[];e.source===`buoy`?r.push(n(`significantHeight`,Y(`lab.height`),.3,zt(e.spot),.1,Xd(e.significantHeight,t)),n(`peakPeriod`,Y(`lab.period`),6,18,.5,`${e.peakPeriod.toFixed(1)} s`),n(`spread`,Y(`lab.spread`),0,1,.05,sm(e.spread))):e.source===`storm`&&r.push(n(`stormWindSpeed`,Y(`lab.stormWind`),8,30,1,Yd(e.stormWindSpeed,t)),n(`stormFetchKm`,Y(`lab.fetch`),50,2e3,50,`${e.stormFetchKm} km`),n(`stormDurationHours`,Y(`lab.duration`),3,96,3,`${e.stormDurationHours} h`),n(`stormDistanceKm`,Y(`lab.distance`),0,1e4,100,`${e.stormDistanceKm} km`));let i=e.source===`practice`,a=i?_e(e.spot).directionDegrees??e.directionDegrees:e.directionDegrees;return r.push({...n(`directionDegrees`,Y(`lab.direction`),-40,40,5,`${a}°`),value:a,disabled:i}),r.push({key:`tide`,group:`conditions`,label:Y(`lab.tide`),min:-1,max:1,step:.1,value:e.tide,text:Xd(e.tide,t)},{key:`windSpeed`,group:`conditions`,label:Y(`lab.wind`),min:-12,max:12,step:1,value:e.windSpeed,text:om(e.windSpeed,t)}),r}var fm=e=>({...e,physical:{...e.physical}});function pm(e,t,n,r){return Q(`div`,{class:`segmented`},...e.map(e=>Q(`button`,{attrs:{type:`button`,"aria-pressed":String(e.value===t)},dataset:{nav:``,key:`${r}:${e.value}`},text:e.label,on:{click:()=>n(e.value)}})))}function mm(e,t){let n=fm(e.settings),r=fm(e.running),{units:i}=e,a=e.scale??`face`,o=(e,t,n,r={})=>Q(`button`,{class:`lab-tool`,attrs:{type:`button`,title:Y(t),...r},dataset:{nav:``},on:{click:n}},pc(Wd[e]),Q(`span`,{text:Y(t)})),s=Q(`aside`,{class:`lab-panel`,attrs:{"aria-label":Y(`lab.settings`)}});s.hidden=!0;let c=Q(`p`,{class:`lab-pending`,text:Y(`lab.pending`)}),l=Q(`button`,{class:`button-primary`,attrs:{type:`button`},dataset:{nav:``},text:Y(`lab.apply`),on:{click:()=>t.apply(fm(n))}}),u=Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``},text:Y(`lab.newSea`),on:{click:()=>t.newSea(fm(n))}}),d,f=()=>{let e=nm(r,n);l.disabled=!e,c.hidden=!e},p=e=>{f(),t.change(fm(n)),e&&_()},m=(e,t,r=!0)=>{n.physical[e]=t,p(r)},h=(e,t,n,r,i,a,o,s=!1)=>{let c=Q(`output`,{text:a}),l=Q(`input`,{attrs:{type:`range`,min:String(t),max:String(n),step:String(r),value:String(i)}});return l.disabled=s,l.addEventListener(`input`,()=>o(Number(l.value),c)),Q(`label`,{class:`slider`},Q(`span`,{text:e}),l,c)},g=(e,...t)=>Q(`fieldset`,{class:`lab-group`},Q(`legend`,{text:Y(e)}),...t);function _(){let r=document.activeElement?.dataset?.key,{physical:o}=n,_=dm(o,i),v=e=>_.filter(t=>t.group===e).map(e=>h(e.label,e.min,e.max,e.step,e.value,e.text,(t,r)=>{n.physical[e.key]=t,r.textContent=dm(n.physical,i).find(t=>t.key===e.key)?.text??``,y&&o.source===`storm`&&(y.textContent=cm(n.physical,i)),y&&o.source===`buoy`&&(y.textContent=um(n.physical,i,a)),p(!1)},e.disabled)),y=o.source===`storm`?Q(`p`,{class:`lab-derived`,text:cm(o,i)}):o.source===`practice`?Q(`p`,{class:`lab-note`,text:lm(i,o.spot)}):Q(`p`,{class:`lab-derived`,text:um(o,i,a)}),b=im(n),x=h(Y(`lab.sunHeight`),0,1,.05,n.sunHeight,`${Math.round(n.sunHeight*100)} %`,(e,t)=>{n.sunHeight=e,t.textContent=`${Math.round(e*100)} %`,p(!1)}),S=h(Y(`lab.sunDirection`),-180,180,5,n.sunDirection,`${n.sunDirection}°`,(e,t)=>{n.sunDirection=e,t.textContent=`${e}°`,p(!1)});s.replaceChildren(...[g(`lab.group.break`,pm(Pe.map(e=>({value:e,label:Y(`spot.${e}`)})),o.spot,e=>m(`spot`,e),`spot`)),g(`lab.group.swell`,pm([`buoy`,`storm`,`practice`].map(e=>({value:e,label:Y(`lab.source.${e}`)})),o.source,e=>m(`source`,e),`source`),...v(`swell`),y),g(`lab.group.conditions`,...v(`conditions`)),g(`lab.group.light`,pm(Object.keys(St).map(e=>({value:e,label:Y(`cond.time.${e}`)})),b,e=>{e!==`custom`&&(Object.assign(n,St[e]),p(!0))},`time`),x,S),g(`lab.group.water`,pm([`classic`,`rich`].map(e=>({value:e,label:Y(`lab.look.${e}`)})),n.waterLook,e=>{n.waterLook=e,p(!0)},`look`)),e.devTools?g(`lab.group.dev`,pm([{value:`graphics`,label:`As Graphics`},{value:2,label:`Boussinesq`},{value:1,label:`Shallow water`}],n.water===`graphics`?`graphics`:o.stage,e=>{e===`graphics`?(n.water=`graphics`,p(!0)):(n.water=`chosen`,m(`stage`,e))},`stage`),n.water===`chosen`?pm([{value:`auto`,label:`GPU when available`},{value:`cpu`,label:`CPU only`}],o.compute,e=>m(`compute`,e),`compute`):null,t.soundCheck?Q(`button`,{class:`button-secondary`,attrs:{type:`button`},dataset:{nav:``},text:`Sound check`,on:{click:()=>{d?(d.remove(),d=void 0):(d=t.soundCheck(),ne.append(d))}}}):null):null,c,Q(`div`,{class:`lab-actions`},l,u)].filter(e=>e!==null)),f(),r&&s.querySelector(`[data-key="${r}"]`)?.focus()}let v=o(`settings`,`lab.settings`,()=>{s.hidden=!s.hidden,v.setAttribute(`aria-expanded`,String(!s.hidden))},{"aria-expanded":`false`}),y=o(`follow`,`lab.follow`,()=>t.follow(),{"aria-pressed":`false`}),b=o(`pause`,`lab.pauseSea`,()=>t.togglePause()),x=o(`step`,`lab.step`,()=>t.step());x.disabled=!0;let S=Jp.map(e=>Q(`button`,{attrs:{type:`button`,"aria-pressed":String(e===1)},dataset:{nav:``},text:`${e}×`,on:{click:()=>t.setScale(e)}})),C=[1,2,3,4].map(e=>Q(`button`,{attrs:{type:`button`,title:`${e}`},dataset:{nav:``},text:Y(`lab.jump.${e}`),on:{click:()=>t.jump(e)}})),w=Q(`button`,{class:`hud-pause lab-menu`,attrs:{type:`button`,"aria-label":Y(`lab.menu`)},dataset:{nav:``},on:{click:()=>t.menu()}},pc(Wd.pause)),T=Q(`div`,{class:`lab-toolbar`,attrs:{role:`toolbar`,"aria-label":Y(`lab.title`)}},v,y,b,x,Q(`div`,{class:`segmented lab-speed`,attrs:{"aria-label":Y(`lab.slowMotion`)}},...S),Q(`div`,{class:`segmented lab-speed lab-jumps`},...C),o(`eye`,`lab.hideUi`,()=>t.hideUi()),w);T.addEventListener(`pointerup`,e=>{e.pointerType===`mouse`&&document.activeElement?.blur()});let E=Q(`strong`,{text:`…`}),D=Q(`dl`,{class:`lab-info-rows`}),O=Q(`dl`),k=e.devTools?new Vd(O):void 0,A=Q(`button`,{class:`lab-info-head`,attrs:{type:`button`,"aria-expanded":`true`},dataset:{nav:``}},E,Q(`small`,{text:Y(`lab.info`)}));A.addEventListener(`click`,()=>{let e=A.getAttribute(`aria-expanded`)!==`true`;A.setAttribute(`aria-expanded`,String(e)),D.hidden=!e,O.hidden=!e});let ee=Q(`aside`,{class:`lab-info`,attrs:{"aria-live":`off`}},A,D,e.devTools?Q(`div`,{class:`physics-readout`},O):null);e.touch&&(A.setAttribute(`aria-expanded`,`false`),D.hidden=!0,O.hidden=!0);let te=e.touch?hm(t):null,j=Q(`button`,{class:`lab-show`,attrs:{type:`button`},text:Y(`lab.showUi`),on:{click:()=>t.hideUi()}}),ne=Q(`section`,{class:`screen screen-lab`,attrs:{"aria-label":Y(`lab.title`)}},T,s,ee,te,e.touch?null:Q(`p`,{class:`lab-hint`,text:Y(`lab.hint`)}),j);return _(),{root:ne,update(e){y.setAttribute(`aria-pressed`,String(e.following)),b.replaceChildren(pc(Wd[e.paused?`play`:`pause`]),Q(`span`,{text:Y(e.paused?`lab.playSea`:`lab.pauseSea`)})),x.disabled=!e.paused,S.forEach((t,n)=>t.setAttribute(`aria-pressed`,String(Jp[n]===e.scale))),ne.classList.toggle(`is-ui-hidden`,e.uiHidden),e.info&&(E.textContent=e.info.summary,D.replaceChildren(...e.info.rows.map(e=>Q(`div`,{},Q(`dt`,{text:e.label}),Q(`dd`,{text:e.value}))))),e.readout&&k?.render(e.readout)},setRunning(e){r=fm(e),f()}}}function hm(e){let t=Q(`span`,{class:`lab-stick-knob`}),n=Q(`div`,{class:`lab-stick`,attrs:{role:`presentation`}},t),r=r=>{let i=n.getBoundingClientRect(),a=i.width/2,o=e=>Math.max(-1,Math.min(1,e)),s=o((r.clientX-(i.left+a))/a),c=o(-(r.clientY-(i.top+a))/a);t.style.transform=`translate(${s*a*.6}px, ${-c*a*.6}px)`,e.stick(s,c)};n.addEventListener(`pointerdown`,e=>{e.preventDefault(),n.setPointerCapture(e.pointerId),r(e)}),n.addEventListener(`pointermove`,e=>{n.hasPointerCapture(e.pointerId)&&r(e)});let i=()=>{t.style.transform=``,e.stick(0,0)};n.addEventListener(`pointerup`,i),n.addEventListener(`pointercancel`,i);let a=(t,n)=>{let r=Q(`button`,{attrs:{type:`button`},text:Y(t)});r.addEventListener(`pointerdown`,t=>{t.preventDefault(),r.setPointerCapture(t.pointerId),e.rise(n)});for(let t of[`pointerup`,`pointercancel`,`lostpointercapture`])r.addEventListener(t,()=>e.rise(0));return r};return Q(`div`,{class:`lab-touch`},n,a(`lab.up`,1),a(`lab.down`,-1))}function gm(e){return{notice:e.status===`reconnecting`?Y(`online.reconnecting`):e.phase===`catching-up`?e.behind!==void 0&&e.behind>1?Y(`online.catchingUpBy`,{s:Math.ceil(e.behind)}):Y(`online.catchingUp`):e.phase===`resyncing`?Y(`online.resyncing`):e.respawnIn===void 0?void 0:Y(`online.respawnIn`,{s:Math.max(1,Math.ceil(e.respawnIn))}),feed:e.feed.filter(t=>t.until>e.now).map(t=>Y(`online.feed`,{name:t.name,distance:Zd(t.distance,e.units),seconds:t.seconds.toFixed(1)}))}}function _m(e,t,n){return e.map(e=>({id:e.id,name:e.name,you:e.id===t,kick:n&&e.id!==t}))}var vm=class{root=Q(`div`,{class:`online-hud`});notice=Q(`p`,{class:`online-notice`,attrs:{role:`status`}});feed=Q(`ol`,{class:`online-feed`,attrs:{"aria-live":`polite`}});shown=``;constructor(){this.root.append(this.notice,this.feed),this.notice.hidden=!0}update(e){let t=JSON.stringify(e);t!==this.shown&&(this.shown=t,this.notice.hidden=e.notice===void 0,this.notice.textContent=e.notice??``,this.feed.replaceChildren(...e.feed.map(e=>Q(`li`,{text:e}))))}},ym=class{onKick;root;list=Q(`ul`,{class:`online-players`});shown=``;constructor(e,t){this.onKick=t;let n=Q(`button`,{class:`strip-button`,attrs:{type:`button`},dataset:{nav:``},text:Y(`online.copyLink`),on:{click:()=>{globalThis.navigator?.clipboard?.writeText(e).then(()=>{n.textContent=Y(`online.copied`)},()=>{})}}});this.root=Q(`section`,{class:`online-players-panel`,attrs:{"aria-label":Y(`online.players`)}},Q(`h3`,{class:`panel-subhead`,text:Y(`online.players`)}),this.list,Q(`p`,{class:`online-link`},Q(`span`,{text:e}),n))}update(e){let t=JSON.stringify(e);t!==this.shown&&(this.shown=t,this.list.replaceChildren(...e.map(e=>Q(`li`,{},Q(`span`,{text:e.name}),e.you?Q(`small`,{text:Y(`online.you`)}):null,e.kick?Q(`button`,{class:`strip-button`,attrs:{type:`button`},dataset:{nav:``},text:Y(`online.kick`),on:{click:()=>this.onKick(e.id)}}):null))))}},bm={wipeout:`end.wipeout`,complete:`end.complete`,ended:`end.ended`},xm={"bottom turn":`maneuver.bottomTurn`,"top turn":`maneuver.topTurn`,snap:`maneuver.snap`,cutback:`maneuver.cutback`};function Sm(e,t,n,r){let{report:i}=e,a=[{label:`end.distance`,value:Zd(e.distance,n)},{label:`end.topSpeed`,value:Yd(e.topSpeed,n)},{label:`end.time`,value:Qd(e.seconds)}];return i&&a.push({label:`end.pocket`,value:Qd(i.pocketTime)}),r&&a.push({label:`end.score`,value:r.score.toFixed(1)},{label:`end.bestTwo`,value:r.bestTwo.toFixed(1)}),{title:bm[e.outcome],reason:e.reason,stats:a,turns:(i?.maneuvers??[]).map(e=>({label:xm[e.kind],value:`${Math.round((e.speedIn>0?e.speedOut/e.speedIn:0)*100)} %`})),...e.timeScale!==void 0&&e.timeScale<1?{slowMotion:String(Math.round(e.timeScale*100)/100)}:{},newBest:t.length>0}}function Cm(e,t,n){let r=(e,t,n=!1)=>Q(`button`,{class:n?`button-primary`:`button-secondary`,attrs:{type:`button`},text:e,on:{click:t}});return Q(`aside`,{class:`end-card`,attrs:{role:`status`}},Q(`header`,{class:`end-card-head`},Q(`div`,{},Q(`h2`,{text:Y(e.title)}),Q(`p`,{class:`end-card-reason`,text:Y(e.reason)})),e.newBest?Q(`span`,{class:`end-card-best`,text:Y(`end.newBest`)}):null),Q(`dl`,{class:`end-card-stats`},...e.stats.map(e=>Q(`div`,{},Q(`dt`,{text:Y(e.label)}),Q(`dd`,{text:e.value})))),e.turns.length>0?Q(`p`,{class:`end-card-turns`,text:`${Y(`end.turns`)}: ${e.turns.map(e=>`${Y(e.label)} ${e.value}`).join(` · `)}`}):null,e.slowMotion?Q(`p`,{class:`end-card-note`,text:Y(`end.slowMotion`,{scale:e.slowMotion})}):null,Q(`div`,{class:`end-card-actions`},r(Y(`end.replay`,{key:n}),t.replay,!0),r(Y(`end.newWave`),t.newWave),r(Y(`end.changeSpot`),t.changeSpot),r(Y(`end.menu`),t.menu)))}var wm=Math.PI/180,Tm=2,Em=.85,Dm=1.5,Om=20,km=(e,t,n)=>Math.max(t,Math.min(n,e)),Am=e=>e.speedIn>0?e.speedOut/e.speedIn:0;function jm(e){return(.4*Math.min(1.2,Math.abs(e.yaw)/(150*wm))+.3*Math.min(1.3,e.peakYawRate/3)+.3*Math.min(1.2,e.speedIn/9))*(.5+.5*(.5*e.faceFraction+.5*!!e.pocket))}function Mm(e){let{maneuvers:t}=e,n=t.map(jm).sort((e,t)=>t-e),r=new Set(t.map(e=>e.kind===`snap`?`top turn`:e.kind)),i=0;for(let e=1;e<t.length;e+=1){let n=t[e-1];t[e].start-n.end<=Tm&&Am(n)>=Em&&(i+=1)}let a=t.length?t.reduce((e,t)=>e+Am(t),0)/t.length:0,o=t[t.length-1],s={manoeuvres:1.5*n.slice(0,3).reduce((e,t)=>e+t,0),variety:.5*r.size/3,combination:.75*i/Math.max(1,t.length-1),flow:t.length?.75*km((a-.7)/.25,0,1):0,length:Math.min(1,e.duration/Om),completion:e.end===`fell`&&o&&e.duration-o.end<=Dm?.5:1},c=(s.manoeuvres+s.variety+s.combination+s.flow+s.length)*s.completion;return{score:km(Math.round(c*10)/10,.1,10),parts:s}}function Nm(e){let[t=0,n=0]=[...e].sort((e,t)=>t-e);return Math.round((t+n)*10)/10}var Pm=[`lean`,`trim`,`crouch`,`compress`,`hand`,`duckDive`,`reel`],Fm=[`lean`,`trim`,`crouch`,`compress`,`hand`],Im=`breakline.hints.v1`;function Lm(e,t){return e!==`compress`||t===`practice`}var Rm=class{storage;learned=new Set;constructor(e){this.storage=e;try{let t=JSON.parse(e?.getItem(`breakline.hints.v1`)??`[]`);if(Array.isArray(t))for(let e of t)Pm.includes(e)&&this.learned.add(e)}catch{}}offer(e){return!this.learned.has(e)}succeeded(e){if(!this.learned.has(e)){this.learned.add(e);try{this.storage?.setItem(Im,JSON.stringify([...this.learned]))}catch{}}}},zm=.3,Bm=8,Vm=class{book;standingTime=0;held={lean:0,trim:0,crouch:0,compress:0,hand:0,duckDive:0,reel:0};constructor(e){this.book=e}update(e,t,n=()=>!0){if(!t.standing){this.standingTime=0;for(let e of Fm)this.held[e]=0;return this.inTheWater(e,t,n)}this.standingTime+=e;let{input:r}=t,i={lean:Math.abs(r.steer)>.5,trim:Math.abs(r.trim??0)>.5,crouch:(r.crouch??0)>.5,compress:(r.compress??0)>.5,hand:r.hand??!1};for(let t of Fm)this.held[t]=i[t]?this.held[t]+e:0,this.held[t]>=.499999999&&this.book.succeeded(t);let a=[];return t.crestBreaking>zm&&a.push(`hand`),this.standingTime>=1.999999999&&a.push(`lean`),this.standingTime>=4.999999999&&a.push(`trim`,`crouch`,`compress`),a.find(e=>n(e)&&this.book.offer(e))}inTheWater(e,t,n){let r=t.phase===`prone`,i=t.phase===`fallen`;this.held.duckDive=r&&(t.input.duckDive??0)>.5?this.held.duckDive+e:0,this.held.reel=i&&t.input.reel?this.held.reel+e:0;for(let e of[`duckDive`,`reel`])this.held[e]>=.499999999&&this.book.succeeded(e);let a=[];return r&&(t.whitewaterAhead??1/0)<=Bm&&a.push(`duckDive`),i&&t.leashIntact&&!t.boardInReach&&a.push(`reel`),a.find(e=>n(e)&&this.book.offer(e))}};function Hm(e,t){if(!e)return``;switch(e.phase){case`prone`:return e.cue?Y(`hud.prompt.popUp`,{popUp:t.popUp}):Y(`hud.prompt.paddle`,{paddle:t.paddle});case`push`:case`landing`:return Y(`hud.prompt.rising`);case`fallen`:return e.leash?.snapped?Y(`hud.prompt.leashSnapped`,{popUp:t.popUp,retry:t.retry}):e.boardInReach?Y(`hud.prompt.inReach`,{popUp:t.popUp}):Y(`hud.prompt.fallen`,{popUp:t.popUp,retry:t.retry});default:return``}}function Um(e,t){return e===`always`||e===`practice`&&t===`practice`}function Wm(e,t){return e===`always`||e===`practice`&&t===`practice`}var Gm=.85;function Km(e){return e>=.5?0:Gm*Math.min(1,(.5-e)/.5)}function qm(e,t){return e>t?{seen:e,text:Y(`hud.heldDown`).toUpperCase()}:{seen:e}}function Jm(e,t){if(!e)return{key:``};let n=`${e.kind}@${e.start.toFixed(2)}`;return n===t?{key:n}:{key:n,text:Y(xm[e.kind]).toUpperCase()}}var Ym=.3;function Xm(e){let t=(e.compress??0)>=.5?`compress`:(e.crouch??0)>=Ym?`crouch`:`normal`,n=e=>Math.max(-1,Math.min(1,e));return{level:t,weight:n(e.trim??0),...e.rotate===void 0?{}:{rotate:n(e.rotate)}}}var Zm=.3,Qm=class{root;prompt=Q(`p`,{class:`hud-prompt`,attrs:{"aria-live":`polite`}});speedValue=Q(`strong`);speedUnit=Q(`small`);balance=Q(`div`,{class:`hud-balance`,attrs:{role:`meter`,"aria-label":Y(`hud.balance`),"aria-valuemin":`0`,"aria-valuemax":`100`}});balanceFill=Q(`div`,{class:`hud-balance-fill`});hints=Q(`div`,{class:`hud-hints`});hintKeys=``;callout=Q(`p`,{class:`hud-callout`,attrs:{"aria-live":`polite`}});calloutKey=``;coach=Q(`p`,{class:`hud-coach`,attrs:{"aria-live":`polite`}});breath=Q(`div`,{class:`hud-balance hud-breath`,attrs:{role:`meter`,"aria-label":Y(`hud.breath`),"aria-valuemin":`0`,"aria-valuemax":`100`}});breathFill=Q(`div`,{class:`hud-balance-fill`});vignette=Q(`div`,{class:`hud-vignette`,attrs:{"aria-hidden":`true`}});rescuesSeen=-1;stance=Q(`div`,{class:`hud-stance`,attrs:{role:`group`,"aria-label":Y(`hud.stance`)}});stanceLevel=Q(`span`,{class:`hud-stance-level`});weightDot=Q(`i`);rotateDot=Q(`i`);rotateRow=Q(`div`,{class:`hud-stance-row`});stanceText=``;constructor(e){this.balance.append(this.balanceFill),this.breath.append(this.breathFill),this.rotateRow.append(Q(`small`,{text:Y(`hud.stance.rotation`)}),Q(`span`,{class:`hud-track`},this.rotateDot)),this.stance.append(this.stanceLevel,Q(`div`,{class:`hud-stance-row`},Q(`small`,{text:Y(`hud.stance.weight`)}),Q(`span`,{class:`hud-track`},this.weightDot)),this.rotateRow),this.root=Q(`section`,{class:`ride-hud`,attrs:{"aria-label":Y(`hud.speed`)}},this.vignette,this.prompt,this.callout,this.coach,Q(`div`,{class:`hud-readout`},this.balance,this.breath,Q(`div`,{class:`hud-speed`},this.speedValue,this.speedUnit),this.stance),Q(`button`,{class:`hud-pause`,attrs:{type:`button`,"aria-label":Y(`hud.pause`)},on:{click:e}},pc(Wd.pause)),this.hints)}updateStance(e,t,n){if(this.stance.hidden=!n||!t||!e,this.stance.hidden||!e)return;let{level:r,weight:i,rotate:a}=Xm(e),o=Y(`hud.stance.${r}`);o!==this.stanceText&&(this.stanceText=o,this.stanceLevel.textContent=o,this.stance.dataset.level=r),this.weightDot.style.left=`${(50+50*i).toFixed(1)}%`,this.rotateRow.hidden=a===void 0,a!==void 0&&(this.rotateDot.style.left=`${(50+50*a).toFixed(1)}%`)}update(e,t,n,r,i=!0,a=``,o,s=!1){this.coach.textContent!==a&&(this.coach.textContent=a),this.coach.hidden=a===``;let c=o??Hm(e,n);this.prompt.textContent!==c&&(this.prompt.textContent=c),this.prompt.hidden=c===``;let l=Jm(e?.live,this.calloutKey);this.calloutKey=l.key;let u=e?.rescues??0,d=this.rescuesSeen<0?{seen:u}:qm(u,this.rescuesSeen);this.rescuesSeen=d.seen,d.text&&(l.text=d.text),l.text&&(this.callout.textContent=l.text,this.callout.classList.remove(`is-shown`),this.callout.offsetWidth,this.callout.classList.add(`is-shown`));let{value:f,unit:p}=Jd(e?.speed??0,t);this.speedValue.textContent!==f&&(this.speedValue.textContent=f),this.speedUnit.textContent!==p&&(this.speedUnit.textContent=p);let m=e?.phase===`standing`||e?.phase===`recover`;if(this.balance.hidden=!m||!i,m){let t=e.balance;this.balanceFill.style.transform=`scaleY(${t.toFixed(3)})`,this.balance.classList.toggle(`is-low`,t<Zm),this.balance.setAttribute(`aria-valuenow`,Math.round(t*100).toString())}let h=e?.breath??1;this.breath.hidden=!s||e?.phase!==`fallen`||h>=.999,this.breath.hidden||(this.breathFill.style.transform=`scaleY(${Math.max(0,h).toFixed(3)})`,this.breath.classList.toggle(`is-low`,h<Zm),this.breath.setAttribute(`aria-valuenow`,Math.round(Math.max(0,h)*100).toString()));let g=Km(h).toFixed(2);this.vignette.style.opacity!==g&&(this.vignette.style.opacity=g),this.hints.hidden=!r;let _=`${n.paddle}|${n.popUp}|${n.steer}|${n.pause}`;if(r&&_!==this.hintKeys){this.hintKeys=_;let e=(e,t)=>Q(`span`,{},Q(`span`,{class:`keycap`,text:e}),` ${Y(t)}`);this.hints.replaceChildren(e(n.paddle,`hud.hint.paddle`),e(n.popUp,`hud.hint.popUp`),e(n.steer,`hud.hint.steer`),e(n.pause,`hud.hint.pause`))}}},$m=new Set([`menu`,`ride`,`wavelab`,`stage`,`lesson`]),eh=class{screens;constructor(e){this.screens=[e]}get current(){return this.screens[this.screens.length-1]}get stack(){return this.screens}get base(){for(let e=this.screens.length-1;e>=0;--e)if($m.has(this.screens[e]))return this.screens[e];return this.screens[0]}push(e){this.screens.push(e)}back(){if(!(this.screens.length<=1))return this.screens.pop(),this.current}reset(e){this.screens=[e]}},th={swell:[`practice`,`small`,`medium`,`big`],tide:[`low`,`mid`,`high`],wind:[`offshore`,`calm`,`onshore`],time:[`dawn`,`midday`,`sunset`]};function nh(e){let t=e.spot===`pool`,n=Object.keys(th).filter(e=>!t||e!==`tide`&&e!==`wind`);return{spots:Pe.map(t=>({id:t,name:`spot.${t}`,blurb:`spot.${t}.blurb`,selected:t===e.spot})),rows:n.map(n=>{if(t&&n===`swell`){let t=Nt(e.conditions.swell);return{id:n,label:`cond.size`,options:[`small`,`medium`,`big`].map(e=>({value:e,label:`cond.swell.pool.${e}`,selected:t===e}))}}return{id:n,label:`cond.${n}`,options:th[n].map(t=>({value:t,label:`cond.${n}.${t}`,selected:e.conditions[n]===t}))}})}}var rh={beach:`<path d="M4 38c10-4 20 4 30 0s20-4 30 0 10 2 12 1"/><path d="M14 26c6-3 12-3 18 0M48 24c6-3 12-3 18 0" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>`,point:`<path d="M4 42h24c10 0 14-8 20-16s12-14 28-16"/><path d="M34 34c6-8 14-16 30-18" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>`,reef:`<path d="M4 42c14-2 24-2 36-2s22 0 36 2"/><path d="M8 20L50 40" stroke-dasharray="3 3"/><path d="M60 40V20M70 40V20" stroke-dasharray="3 3" opacity=".6"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>`,canyon:`<path d="M4 42c14-2 24-2 36-2s22 0 36 2"/><path d="M36 42V14M44 42V14" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>`,padang:`<path d="M4 42c10-6 22-8 36-8s26 2 36 8"/><path d="M4 18h14L58 34" stroke-dasharray="3 3"/><path d="M64 40V16M74 40V16" stroke-dasharray="3 3" opacity=".6"/><path d="M4 10c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>`,pool:`<rect x="4" y="4" width="72" height="40" rx="2"/><path d="M12 38L40 18L68 38" stroke-dasharray="3 3"/><path d="M8 12h64" opacity=".45"/>`};function ih(e){return pc(`<svg viewBox="0 0 80 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${rh[e]}</svg>`)}function ah(e,t){for(let n of e.querySelectorAll(`button`))n.setAttribute(`aria-pressed`,String(n===t))}function oh(e,t,n){let r={spot:e.spot,conditions:{...e.conditions}},i=nh(r),a=n?Q(`p`,{class:`choice-note`,text:n(r)}):void 0,o=e=>{a&&n&&(a.textContent=n(e)),t(e)},s=Q(`div`,{class:`spot-cards`,attrs:{role:`group`,"aria-label":Y(`surf.title`)}}),c=Q(`div`,{class:`choice-rows`}),l=()=>{let e=nh(r).rows.map(e=>{let t=Q(`div`,{class:`segmented`,attrs:{role:`group`,"aria-label":Y(e.label)}});for(let n of e.options){let i=Q(`button`,{attrs:{type:`button`,"aria-pressed":String(n.selected)},dataset:{nav:``},text:Y(n.label),on:{click:()=>{r.conditions[e.id]=n.value,ah(t,i),o({...r,conditions:{...r.conditions}})}}});t.append(i)}return Q(`div`,{class:`choice-row`},Q(`span`,{class:`choice-label`,text:Y(e.label)}),t)});c.replaceChildren(...e,...a?[a]:[])};for(let e of i.spots){let t=Q(`button`,{class:`spot-card`,attrs:{type:`button`,"aria-pressed":String(e.selected)},dataset:{nav:``},on:{click:()=>{let n=r.spot===`pool`!=(e.id===`pool`);r.spot=e.id,ah(s,t),n&&l(),o({...r,conditions:{...r.conditions}})}}},ih(e.id),Q(`span`,{class:`spot-text`},Q(`strong`,{text:Y(e.name)}),Q(`small`,{text:Y(e.blurb)})));s.append(t)}return l(),[s,c]}function sh(e,t,n,r){return Q(`section`,{class:`screen screen-panel`,attrs:{"aria-label":Y(`surf.title`)}},Q(`div`,{class:`panel`},Q(`header`,{class:`panel-header`},Q(`button`,{class:`icon-back`,attrs:{type:`button`,"aria-label":Y(`surf.back`)},dataset:{nav:``},on:{click:t.back}},pc(Wd.back)),Q(`h2`,{text:Y(`surf.title`)})),...oh(e,t.change,r),n,Q(`footer`,{class:`panel-footer`},Q(`button`,{class:`button-primary`,attrs:{type:`button`},dataset:{nav:``,navDefault:``},text:Y(`surf.paddleOut`),on:{click:t.paddleOut}}))))}function ch(e){let t=be(e.body),n=(e,t,n,r,i)=>({id:e,label:`surfer.row.${e}`,options:t.map(e=>({value:e,label:r(e),selected:n===e,...i?{swatch:i(e)}:{}}))});return{rows:[n(`sex`,G,t,e=>`surfer.sex.${e}`),n(`look`,Yt(t).map(String),String(Rt(e.body)),e=>`surfer.look.${e}`),n(`outfit`,_t,e.outfit,t=>`surfer.outfit.${Re({...e,outfit:t})}`),n(`color`,Object.keys(rt),e.color,e=>`surfer.color.${e}`,e=>rt[e]),n(`board`,L.map(e=>e.id),e.board,e=>`surfer.board.${e}`)]}}function lh(e,t,n){return t===`sex`?{body:d(n,Rt(e.body))}:t===`look`?{body:d(be(e.body),Number(n))}:{[t]:n}}function uh(e,t,n,r){let i={...e},a=t,o=Q(`canvas`,{class:`surfer-preview`,attrs:{role:`img`,"aria-label":Y(`surfer.preview`)}}),s=r?.(o);s||(o.hidden=!0);let c=Q(`div`,{class:`choice-rows surfer-rows`}),l=()=>{c.replaceChildren(...ch(i).rows.map(e=>{let t=Q(`div`,{class:e.id===`color`?`segmented swatches`:`segmented`,attrs:{role:`group`,"aria-label":Y(e.label)}});for(let r of e.options){let o=Q(`button`,{attrs:{type:`button`,"aria-pressed":String(r.selected),...r.swatch?{"aria-label":Y(r.label),style:`--swatch: ${r.swatch}`}:{}},dataset:{nav:``},...r.swatch?{}:{text:Y(r.label)},on:{click:()=>{let t=lh(i,e.id,r.value);Object.assign(i,t),n.change(t),s?.show({...i},a),l(),c.querySelector(`[aria-label="${Y(e.label)}"] [aria-pressed="true"]`)?.focus()}}});t.append(o)}return Q(`div`,{class:`choice-row`},Q(`span`,{class:`choice-label`,text:Y(e.label)}),t)}))};return l(),s?.show({...i},a),{root:Q(`section`,{class:`surfer-card`,attrs:{"aria-label":Y(`surfer.title`)}},Q(`h3`,{text:Y(`surfer.title`)}),o,c),setTime(e){a=e,s?.show({...i},a)},dispose(){s?.dispose()}}}var dh=.15,fh=5.4,ph=1.5,mh=.8,hh=class e{canvas;renderer;reducedMotion;scene=new u;camera=new Bt(30,1,.1,100);sun=new B(`#ffffff`,2);view=new M;sky;boardShape=ot();boardPosition=new R(0,0,0);state=a();board;boardDesign;body;angle=.7;frame=0;last=0;constructor(e,t,n){this.canvas=e,this.renderer=t,this.reducedMotion=n,t.outputColorSpace=`srgb`,t.toneMapping=7,t.toneMappingExposure=1.05,t.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2)),this.sky=new jc(t),this.view.setDetail(1/0,2048),F(`standing`,`regular`,this.boardPosition,new p,this.state),this.scene.add(this.view.group,this.sun,this.sun.target),this.tick=this.tick.bind(this),this.frame=requestAnimationFrame(this.tick)}static create(t,n){try{return new e(t,new ga({canvas:t,alpha:!0,antialias:!0}),n.reducedMotion)}catch{return}}show(e,t){this.view.dress(Re(e),{accent:new N(rt[e.color])}),e.body!==this.body&&(this.body=e.body,this.view.load(e.body)),e.board!==this.boardDesign&&(this.boardDesign=e.board,this.board&&this.release(this.board),this.board=Ot(this.boardShape,L.find(t=>t.id===e.board)??L[0]),this.board.position.copy(this.boardPosition),this.scene.add(this.board));let{sunHeight:n,sunDirection:r}=St[t];this.sky.select(Cc(n),r).then(()=>{this.sky.applyTo(this.scene,[]),this.sun.color.copy(this.sky.sunColor),this.sun.intensity=this.sky.sunIntensity,this.sun.position.copy(this.sky.sunDirection).multiplyScalar(10)})}dispose(){cancelAnimationFrame(this.frame),this.board&&this.release(this.board),this.sky.dispose(),this.renderer.dispose(),this.renderer.forceContextLoss()}tick(e){let t=this.last?Math.min(.1,(e-this.last)/1e3):0;this.last=e,this.reducedMotion||(this.angle+=dh*t);let{clientWidth:n,clientHeight:r}=this.canvas;n>0&&r>0&&(this.canvas.width!==Math.round(n*this.renderer.getPixelRatio())||this.camera.aspect!==n/r)&&(this.renderer.setSize(n,r,!1),this.camera.aspect=n/r,this.camera.updateProjectionMatrix()),this.camera.position.set(Math.sin(this.angle)*fh,ph,Math.cos(this.angle)*fh),this.camera.lookAt(0,mh,0),this.view.update(this.state,this.camera.position),this.renderer.render(this.scene,this.camera),this.frame=requestAnimationFrame(this.tick)}release(e){this.scene.remove(e),e.traverse(e=>{if(e instanceof tt){e.geometry.dispose();for(let t of[].concat(e.material))t.dispose()}})}};function gh(e){let t=!1;return async()=>{if(!t){t=!0;try{await e()}finally{t=!1}}}}var _h=class{keep;samples=[];constructor(e=8){this.keep=e}add(e,t,n){let r=n-e;r>=0&&Number.isFinite(t)&&(this.samples.push({offset:t+r/2-n,rtt:r}),this.samples.length>this.keep&&this.samples.shift())}get ready(){return this.samples.length>0}get best(){let e;for(let t of this.samples)(!e||t.rtt<e.rtt)&&(e=t);return e}get offset(){return this.best?.offset??0}get rtt(){return this.best?.rtt??NaN}serverNow(e){return e+this.offset}};function vh(e,t){return e.seaTimeAtCreate+(t-e.createdAt)/1e3}var yh=1,bh=500,xh=3e3,Sh=2e3,Ch=[1e3,2e3,4e3,8e3];function wh(e){return`${e.protocol===`https:`?`wss`:`ws`}://${e.host}/ws`}var Th=class{url;hello;events;clock=new _h;socket;stopped=!1;attempts=0;pingTimer;retryTimer;makeSocket;now;constructor(e,t,n,r={}){this.url=e,this.hello=t,this.events=n,this.makeSocket=r.socket??(e=>new WebSocket(e)),this.now=r.now??(()=>performance.now()),n.status(`connecting`),this.connect()}get open(){return this.socket?.readyState===yh}send(e){this.open&&this.socket.send(JSON.stringify(e))}sendPose(e){this.sendBinary(e)}sendBinary(e){this.open&&this.socket.send(e)}close(){if(this.stopped)return;this.stop();let{socket:e}=this;this.socket=void 0,e?.close()}stop(){this.stopped=!0,clearTimeout(this.pingTimer),clearTimeout(this.retryTimer),this.events.status(`closed`)}connect(){let e=this.makeSocket(this.url);e.binaryType=`arraybuffer`,this.socket=e,e.onopen=()=>{this.socket!==e||this.stopped||(this.attempts=0,this.events.status(`open`),this.send(this.hello()),this.ping(0))},e.onmessage=({data:t})=>{if(this.socket!==e)return;if(t instanceof ArrayBuffer){this.events.poses(t);return}if(typeof t!=`string`)return;let n=Jo(t);if(n){if(n.type===`pong`){this.clock.add(n.t,n.server,this.now());return}n.type===`refused`&&this.stop(),this.events.message(n)}},e.onclose=()=>{if(this.socket!==e||(clearTimeout(this.pingTimer),this.socket=void 0,this.stopped))return;this.events.status(`reconnecting`);let t=Ch[Math.min(this.attempts,Ch.length-1)];this.attempts+=1,this.retryTimer=setTimeout(()=>this.connect(),t)},e.onerror=()=>{}}ping(e){this.send({type:`ping`,t:this.now()});let t=e<xh?bh:Sh;this.pingTimer=setTimeout(()=>this.ping(e+t),t)}},Eh=3e4,Dh=class{options;room;you;creator=!1;token;status=`connecting`;refusal;remote=new nc;calls=new Map;feed=[];onWelcome;onChange;onRefused;provideSea;seaWanted;seaSource;name;look;net;now;build;reactions=[];poseBytes=new Uint8Array(76);constructor(e){this.options=e,this.name=e.name,this.look=Yo(e.surfer),this.token=e.token,this.build=e.build??`68e263250-qa-contact-height`,this.now=e.now??(()=>performance.now()),this.net=new Th(e.url,()=>this.hello(),{message:e=>this.handle(e),poses:e=>this.receiveBinary(e),status:e=>{this.status=e,this.onChange?.()}},{socket:e.socket,now:this.now})}hello(){let{name:e,look:t,build:n}=this;if(this.room)return{type:`join`,build:n,code:this.room.code,name:e,look:t,...this.token?{token:this.token}:{}};let{intent:r}=this.options;return`create`in r?{type:`create`,build:n,settings:r.create,name:e,look:t,...r.bots?{bots:r.bots}:{}}:{type:`join`,build:n,code:r.join,name:e,look:t,...this.token?{token:this.token}:{}}}receiveBinary(e){let t=new Uint8Array(e);if(t[0]!==2){this.remote.receiveBundle(e,this.now(),this.reactions);return}let n=gs(t);n&&this.takeSea({bytes:n.bytes.slice(),deflated:n.deflated})}takeSea(e){let t=this.seaWanted;this.seaWanted=void 0,t?.(e)}requestSea(e=Eh){return this.takeSea(void 0),this.closed?Promise.resolve(void 0):new Promise(t=>{let n=setTimeout(()=>{this.seaWanted===r&&this.takeSea(void 0)},e),r=e=>{clearTimeout(n),this.seaSource=e?`handed`:`fresh`,t(e)};this.seaWanted=r,this.net.send({type:`needSea`})})}async answerSea(e){let t=await this.provideSea?.();t&&this.net.sendBinary(hs(e,t.bytes,t.deflated))}handle(e){let t=this.now();switch(e.type){case`welcome`:this.room=e.room,this.you=e.you,this.token=e.token,this.creator=e.creator;for(let e of this.remote.ids())this.remote.leave(e);for(let t of e.players)this.remote.join(t);this.onWelcome?.(e.room);break;case`joined`:this.remote.join(e.player);break;case`left`:this.remote.leave(e.id),this.calls.delete(e.id);break;case`call`:this.calls.set(e.id,{call:e.call,until:t+2e3});break;case`ride`:this.feed.push({id:e.id,name:this.nameOf(e.id)??``,distance:e.distance,seconds:e.seconds,until:t+6e3});break;case`seaRequest`:this.answerSea(e.request);break;case`fresh`:this.takeSea(void 0);break;case`refused`:this.refusal=e.reason,this.onRefused?.(e.reason)}this.onChange?.()}get clockReady(){return this.net.clock.ready}seaTimeNow(){return this.room?vh(this.room,this.net.clock.serverNow(this.now())):NaN}takeReactions(){if(!this.reactions.length)return;let e=Float32Array.from(this.reactions);return this.reactions=[],e}sendPose(e){As(e,new DataView(this.poseBytes.buffer),0),this.net.sendPose(this.poseBytes)}call(e){this.net.send({type:`call`,call:e})}rideFinished(e,t){t>=3&&this.net.send({type:`ride`,distance:e,seconds:t})}kick(e){this.net.send({type:`kick`,id:e})}nameOf(e){return e===this.you?this.name:this.remote.info(e)?.name}players(){let e=this.remote.ids().map(e=>this.remote.info(e));return this.you===void 0?e:[{id:this.you,name:this.name,look:this.look},...e]}prune(){let e=this.now();for(let[t,n]of this.calls)n.until<=e&&this.calls.delete(t);this.feed=this.feed.filter(t=>t.until>e),this.remote.prune(e)}get closed(){return this.status===`closed`}close(){this.net.close(),this.takeSea(void 0)}},Oh=[2,5,10,20,30,40,50];function kh(e){let t=e.webGpu===!0&&qo(e.name)!==void 0&&!e.busy,n=e.webGpu===!1?`online.noWebGpu`:e.webGpu===void 0?`online.checkingGpu`:e.refusal===`unreachable`?`online.unreachable`:e.refusal?`online.refused.${e.refusal}`:void 0;return{canCreate:t,canJoin:t&&Bo(e.code)!==void 0,message:n}}function Ah(e,t,n){let r={...e,settings:{...e.settings,conditions:{...e.settings.conditions}}},i=Q(`p`,{class:`online-message`,attrs:{role:`status`}}),a=Q(`button`,{class:`button-primary`,attrs:{type:`button`},dataset:{nav:``},text:Y(`online.create`),on:{click:()=>{kh(r).canCreate&&t.create(r.settings,qo(r.name))}}}),o=Q(`button`,{class:`button-primary`,attrs:{type:`button`},dataset:{nav:``},text:Y(`online.join`),on:{click:()=>{kh(r).canJoin&&t.join(Bo(r.code),qo(r.name))}}}),s=()=>{let e=kh(r);a.disabled=!e.canCreate,o.disabled=!e.canJoin,i.textContent=e.message?Y(e.message):``,i.hidden=!e.message},c=Q(`input`,{class:`text-field`,attrs:{type:`text`,maxlength:`16`,autocomplete:`nickname`,spellcheck:`false`,placeholder:Y(`online.namePlaceholder`),"aria-label":Y(`online.name`)},dataset:{nav:``},on:{input:()=>{r.name=c.value,r.refusal=void 0,s()},change:()=>t.name(c.value)}});c.value=r.name;let l=Q(`input`,{class:`text-field text-field-code`,attrs:{type:`text`,maxlength:`12`,autocomplete:`off`,spellcheck:`false`,autocapitalize:`characters`,placeholder:Y(`online.codePlaceholder`),"aria-label":Y(`online.code`)},dataset:{nav:``},on:{input:()=>{r.code=l.value,r.refusal=void 0,s()},keydown:e=>{e.key===`Enter`&&o.click()}}});l.value=r.code;let u=Q(`div`,{class:`segmented`,attrs:{role:`group`,"aria-label":Y(`online.cap`)}});for(let e of Oh){let t=Q(`button`,{attrs:{type:`button`,"aria-pressed":String(e===r.settings.cap)},dataset:{nav:``},text:String(e),on:{click:()=>{r.settings.cap=e;for(let e of u.querySelectorAll(`button`))e.setAttribute(`aria-pressed`,String(e===t))}}});u.append(t)}let d=oh({spot:r.settings.spot,conditions:r.settings.conditions},e=>{r.settings={...r.settings,spot:e.spot,conditions:e.conditions}});return s(),Q(`section`,{class:`screen screen-panel`,attrs:{"aria-label":Y(`online.title`)}},Q(`div`,{class:`panel panel-online`},Q(`header`,{class:`panel-header`},Q(`button`,{class:`icon-back`,attrs:{type:`button`,"aria-label":Y(`surf.back`)},dataset:{nav:``},on:{click:t.back}},pc(Wd.back)),Q(`h2`,{text:Y(`online.title`)})),Q(`p`,{class:`panel-lead`,text:Y(`online.lead`)}),Q(`label`,{class:`field`},Q(`span`,{class:`choice-label`,text:Y(`online.name`)}),c),n,i,Q(`section`,{class:`online-join`},Q(`h3`,{class:`panel-subhead`,text:Y(`online.joinTitle`)}),Q(`div`,{class:`online-join-row`},l,o)),Q(`section`,{class:`online-create`},Q(`h3`,{class:`panel-subhead`,text:Y(`online.createTitle`)}),...d,Q(`div`,{class:`choice-row`},Q(`span`,{class:`choice-label`,text:Y(`online.cap`)}),u),Q(`footer`,{class:`panel-footer`},a))))}var jh=1e4,Mh=3e3;function Nh(){try{return window.localStorage}catch{return}}var Ph=30,Fh=class{game;controls;settings;stack;root=document.getElementById(`app`);ui=document.getElementById(`ui`);menuInput;scene;backdropSpot;backdropReady=!1;disposeScreen;adapter;benchmark;warmup=0;notice;loading=document.getElementById(`loading`);loadingText=document.getElementById(`loading-text`);surfChoice={spot:it,conditions:{...Dt}};surf;seed=1+Math.floor(Math.random()*9999);rideHud;tracker=new fu;logbook=new cu(Nh());endCard;hintBook=new Rm(Nh());coach=new Vm(this.hintBook);schoolProgress=new Dp(Nh());lessonFlow;lessonStart=`pocket`;lessonOverlay;lessonFresh=!1;schoolError;schoolBusy=!1;sessionScores=[];telemetryList=Q(`dl`);telemetry=Q(`aside`,{class:`ride-telemetry physics-readout`},this.telemetryList);telemetryPanel=new Vd(this.telemetryList);telemetryClock=0;fps=0;rotateHint;rotateDismissed=!1;sound;steam;online;multiplayer;webGpuAsked=!1;onlineHud=new vm;playersPanel;labStore=new am(Nh());labDraft;labScreen;labUiHidden=!1;labClock=0;labRebuilding=!1;constructor(e,t,n,r){this.game=e,this.controls=t,this.settings=n,this.stack=new eh(r.start===`stage`?`stage`:`menu`);let i=Vo(globalThis.location?.search??``);this.multiplayer={name:n.value.online.name,code:i??``,settings:{...Go},webGpu:void 0},i&&r.start===`menu`&&this.stack.push(`multiplayer`),this.scene=r.start===`stage`?`stage`:void 0,this.menuInput=new Nf({root:()=>this.ui,onBack:()=>this.back()}),this.adapter=zo(e.gl),this.rideHud=new Qm(()=>this.pause()),this.setLoadingText(`loading.break`),this.bindTouch(),this.settings.subscribe((e,t)=>{(t===`accessibility`||t===`gameplay`||t===`controls`)&&this.applyAccessibility()}),this.sound=new Bd(n,()=>Sf(this.ui,this.sound.muted)),e.lab.onAction=e=>{e===`menu`?this.pause():this.toggleLabUi()},globalThis.breaklineSound=this.sound,globalThis.breaklineSchool={flow:()=>this.lessonFlow,frame:()=>this.game.school.frame(),ride:()=>this.game.rideStatus},this.ui.addEventListener(`click`,e=>{e.target?.closest?.(`button`)&&this.sound.playUi(`click`)}),window.addEventListener(`keydown`,e=>{if(this.controls.enabled||e.repeat||e.defaultPrevented)return;let t=e.target?.tagName;t!==`INPUT`&&t!==`SELECT`&&t!==`TEXTAREA`&&this.settings.value.controls.bindings.keyboard.mute.includes(e.code)&&this.toggleMute()}),this.steam=r.steam,this.steam?.onChange(()=>this.steamChanged()),this.show(),r.start===`ride`&&this.paddleOut()}steamChanged(){this.steam?.status!==`connected`||this.settings.value.seen.steamController||(this.settings.markSeen(`steamController`),this.stack.current===`menu`&&this.show())}toggleMute(){this.sound.toggleMute()}frame(e,t){this.menuInput.poll(),this.surf=t?.surf;let n=e/1e3;if(this.sound.frame(this.game.soundFrame(n,this.stack.stack.includes(`pause`)),this.game.listenerPose,n),e>0&&e<500&&(this.fps+=(1e3/e-this.fps)*.1),this.stack.current===`ride`&&this.telemetry.isConnected&&(this.telemetryClock+=e,this.telemetryClock>=250&&(this.telemetryClock=0,this.telemetryPanel.render([...this.game.readout,{label:`FRAME RATE`,value:`${Math.round(this.fps)} fps`}]))),this.stack.current===`wavelab`&&this.labScreen&&(this.labClock+=e,this.labClock>=250&&(this.labClock=0,this.labScreen.update(this.labView()))),this.stack.current===`lesson`&&this.lessonFlow&&this.lessonFrame(n),this.stack.current===`ride`){let{gameplay:t,seen:n}=this.settings.value,r=this.game.rideStatus;this.root.dataset.phase=r?.phase??``;let i=r?.wave.valid&&r.wave.crestBreaking>.3&&r.wave.aheadOfCrest>0?r.wave.aheadOfCrest:1/0,a=this.coach.update(e/1e3,{standing:r?.phase===`standing`,crestBreaking:r?.wave.valid?r.wave.crestBreaking:0,input:this.controls.lastRequest,phase:r?.phase,whitewaterAhead:i,leashIntact:r?!r.leash.snapped:!1,boardInReach:r?.boardInReach??!1},e=>this.hintText(e)!==``&&Lm(e,this.practiceSwell));this.rideHud.update(r,t.units,this.hintKeys(),!n.rideHints,Um(t.balanceMeter,this.practiceSwell),a?this.hintText(a):``,void 0,Wm(t.breathMeter,this.practiceSwell)),this.rideHud.updateStance(this.controls.lastRequest,r?.phase===`standing`,t.stanceReadout),this.trackRide()}let{online:r}=this;if(r&&(this.stack.current===`ride`||this.stack.current===`pause`)){let e=this.game.onlineState;this.onlineHud.update(gm({status:r.status,phase:e?.phase,behind:e?.behind,respawnIn:e?.respawnIn,feed:r.feed,units:this.settings.value.gameplay.units,now:performance.now()})),this.stack.current===`pause`&&this.playersPanel?.update(_m(r.players(),r.you,r.creator))}if(this.benchmark&&this.stack.base===`menu`&&this.backdropReady&&this.game.backdropRunning){if(this.warmup<Ph){this.warmup+=1;return}this.benchmark.add(e,t?.stepMs,t?.compute===`gpu`),this.benchmark.done&&this.finishBenchmark()}}redetect(){this.settings.setDetected(void 0),this.startBenchmarkIfNeeded()}get detecting(){return this.benchmark!==void 0}get practiceSwell(){let e=this.online?.room??this.surfChoice;return Ve(e.spot,e.conditions.swell)?`practice`:e.conditions.swell}pause(){let{current:e}=this.stack;(e===`ride`||e===`wavelab`||e===`lesson`&&!this.lessonOverlay)&&this.go(`pause`)}retry(){if(this.stack.base===`lesson`){!this.lessonOverlay&&this.lessonFlow?.retry()&&this.restartAttempt();return}this.game.quickRetry(),this.noteRetry()}noteRetry(){this.tracker.noteRetry(),this.hideEndCard()}back(){this.stack.back()!==void 0&&this.show()}go(e){this.stack.push(e),this.show()}show(){let{current:e,base:t}=this.stack;this.root.dataset.screen=e,this.root.dataset.base=t;let n=e===`lesson`&&!this.lessonOverlay,r=e===`ride`||e===`wavelab`||e===`stage`||n;this.controls.enabled=e===`ride`||n,this.game.lab.input.enabled=e===`wavelab`,this.menuInput.active=!r,this.game.setPaused(this.stack.stack.includes(`pause`)||e===`lesson`&&!n),this.applyAccessibility(),t!==`menu`&&(this.backdropReady=!1),t===`menu`&&this.scene!==`backdrop`&&this.openBackdrop(),t!==`menu`&&this.root.classList.remove(`is-scene-pending`),this.disposeScreen?.(),this.disposeScreen=void 0,this.ui.replaceChildren(...this.render(e)),this.notice&&this.ui.append(this.notice),r?this.game.canvas.focus({preventScroll:!0}):this.menuInput.focusDefault()}render(e){if(e===`menu`){let e=this.steam?yf(this.steam.status,this.settings.value.seen.steamController):void 0;return[Cf({surf:()=>this.go(`surf`),multiplayer:()=>this.go(`multiplayer`),school:()=>this.go(`school`),waveLab:()=>void this.enterWaveLab(),logbook:()=>this.go(`logbook`),settings:()=>this.go(`settings`)},{version:Hd.version,schoolStarted:this.schoolProgress.started,sound:{muted:this.sound.muted,toggle:()=>this.toggleMute()},...e?{steam:{label:Y(e.label),disabled:e.disabled,connect:()=>void this.steam?.request()}}:{}})]}if(e===`surf`){let e=uh(this.settings.value.surfer,this.surfChoice.conditions.time,{change:e=>this.settings.setSurfer(e)},e=>hh.create(e,{reducedMotion:this.settings.value.accessibility.reducedMotion}));return this.disposeScreen=e.dispose,[sh(this.surfChoice,{change:t=>{this.surfChoice=t,e.setTime(t.conditions.time)},paddleOut:()=>void this.paddleOut(),back:()=>this.back()},e.root,e=>qe(e,this.surfWords()))]}if(e===`multiplayer`){this.askWebGpu();let e=uh(this.settings.value.surfer,this.multiplayer.settings.conditions.time,{change:e=>this.settings.setSurfer(e)},e=>hh.create(e,{reducedMotion:this.settings.value.accessibility.reducedMotion}));return this.disposeScreen=e.dispose,[Ah(this.multiplayer,{name:e=>this.settings.setOnlineName(e),create:(e,t)=>{this.multiplayer.settings=e;let n=Math.min(Wo,Math.max(0,Math.round(Number(Xe(`bots`)??0))||0));this.goOnline({create:e,...n?{bots:n}:{}},t)},join:(e,t)=>{this.multiplayer.code=e,this.goOnline({join:e},t)},back:()=>this.back()},e.root)]}if(e===`settings`){let e=_f({store:this.settings,context:()=>({devTools:!0,detecting:this.detecting,steam:this.steam?.status??`unsupported`,padKind:this.controls.lastPadKind}),onSteamConnect:()=>void this.steam?.request(),...this.steam?{external:e=>this.steam.onChange(e)}:{},onBack:()=>this.back(),onRedetect:()=>this.redetect(),onCapture:e=>{this.menuInput.active=!e}});return this.disposeScreen=e.dispose,[e.root]}if(e===`logbook`)return[rf(nf(this.logbook,this.settings.value.gameplay.units,Date.now()),()=>this.back())];if(e===`ride`){let{gameplay:e}=this.settings.value;return[this.rideHud.root,...this.online?[this.onlineHud.root]:[],...e.showTelemetry?[this.telemetry]:[],...this.needsRotateHint()?[this.rotateHintElement()]:[],...this.endCard?[this.endCard]:[]]}if(e===`pause`&&this.online){let e=this.online;return this.playersPanel=new ym(Ho(location.origin,e.room.code),t=>e.kick(t)),this.playersPanel.update(_m(e.players(),e.you,e.creator)),[Pf({resume:()=>this.back(),camera:()=>(this.game.cycleView(),this.viewLabel()),settings:()=>this.go(`settings`),leave:()=>this.quitToMenu(),sound:{muted:this.sound.muted,toggle:()=>this.toggleMute()}},this.viewLabel(),this.playersPanel.root)]}if(e===`school`)return[Op(Up(this.schoolProgress,Cp),{lesson:e=>void this.openLesson(wp(e)),freePractice:e=>void this.openLesson(void 0,e),back:()=>this.back()},this.schoolError)];if(e===`lesson`)return this.lessonScreen();if(e===`pause`&&this.stack.base===`lesson`){let e=this.lessonFlow,{school:t}=this.game;return[Lf({resume:()=>this.back(),restart:()=>{this.back(),this.restartAttempt()},explain:()=>{this.lessonOverlay=`card`,this.back()},slowMotion:()=>(t.setSlowMotion(!t.slowMotion),t.slowMotion),slowMotionOn:t.slowMotion,camera:()=>(this.game.cycleView(),this.viewLabel()),settings:()=>this.go(`settings`),...e&&!e.lesson?{howTo:()=>{this.lessonOverlay=`howto`,this.back()}}:{},lessons:()=>this.toSchool(),quit:()=>this.quitToMenu(),sound:{muted:this.sound.muted,toggle:()=>this.toggleMute()}},this.viewLabel())]}return e===`pause`&&this.stack.base===`wavelab`?[If({resume:()=>this.back(),settings:()=>this.go(`settings`),quit:()=>this.quitToMenu(),sound:{muted:this.sound.muted,toggle:()=>this.toggleMute()}})]:e===`wavelab`?[this.createLabScreen()]:e===`pause`?[Ff({resume:()=>this.back(),replay:()=>void this.paddleOut(),newWave:()=>this.nextWave(),camera:()=>(this.game.cycleView(),this.viewLabel()),settings:()=>this.go(`settings`),quit:()=>this.quitToMenu(),sound:{muted:this.sound.muted,toggle:()=>this.toggleMute()}},this.viewLabel(),K(this.surf,this.surfWords()))]:[]}viewLabel(){let e=`view.${this.game.viewName}`;return e in Ne?Y(e):this.game.viewName}nextWave(){this.seed=this.seed%9999+1,this.paddleOut()}quitToMenu(){this.leaveLesson(),this.leaveWaveLab(),this.leaveRoom(),this.hideEndCard(),this.sessionScores=[],this.stack.reset(`menu`),this.show()}changeSpot(){this.hideEndCard(),this.sessionScores=[],this.stack.reset(`menu`),this.stack.push(`surf`),this.show()}trackRide(){let e=this.game.rideFrame;if(!e)return;e.phase===`standing`&&this.hideEndCard();let t=this.tracker.update(e);t&&this.finishRide(t)}finishRide(e){if(this.online){this.finishOnlineRide(e);return}let{spot:t,conditions:n}=this.surfChoice,r=this.settings.value.gameplay.scoreRides&&e.report?Mm(e.report).score:void 0;r!==void 0&&this.sessionScores.push(r);let{report:i,timeScale:a,...o}=e,s=this.logbook.add({...o,spot:t,conditions:n,seed:this.seed,at:Date.now(),...r===void 0?{}:{score:r}});this.settings.value.seen.rideHints||this.settings.markSeen(`rideHints`),s.length>0&&this.sound.playUi(`chime`),this.hideEndCard();let c=r===void 0?void 0:{score:r,bestTwo:Nm(this.sessionScores)};this.endCard=Cm(Sm(e,s,this.settings.value.gameplay.units,c),{replay:()=>{this.game.quickRetry(),this.noteRetry()},newWave:()=>this.nextWave(),changeSpot:()=>this.changeSpot(),menu:()=>this.quitToMenu()},this.hintKeys().retry),this.stack.current===`ride`&&this.ui.append(this.endCard)}finishOnlineRide(e){let{online:t}=this,n=t?.room;if(!t||!n)return;let{report:r,timeScale:i,...a}=e;this.logbook.add({...a,spot:n.spot,conditions:n.conditions,seed:n.seed,at:Date.now(),online:!0}).length>0&&this.sound.playUi(`chime`),this.settings.value.seen.rideHints||this.settings.markSeen(`rideHints`),t.rideFinished(e.distance,e.seconds)}call(e){this.online&&(this.stack.current===`ride`||this.stack.current===`pause`)&&this.online.call(e)}hideEndCard(){this.endCard?.remove(),this.endCard=void 0}askWebGpu(){this.webGpuAsked||(this.webGpuAsked=!0,xe().then(e=>{this.multiplayer={...this.multiplayer,webGpu:e},this.stack.current===`multiplayer`&&this.show()}))}goOnline=(e,t)=>this.joinOnce(e,t);joining=!1;async joinOnce(e,t){if(!this.joining){this.joining=!0;try{await this.joinRoom(e,t)}finally{this.joining=!1}}}async joinRoom(e,t){this.settings.setOnlineName(t),this.multiplayer={...this.multiplayer,name:t,busy:!0,refusal:void 0},this.setLoadingText(`online.joining`),this.showLoading(!0);let n=`join`in e?e.join:void 0,r=new Dh({url:wh(location),name:t,surfer:this.settings.value.surfer,intent:e,token:n?this.settings.value.online.tokens[n]:void 0}),i=await this.welcomed(r);if(i!==`welcomed`){r.close(),this.failOnline(i);return}let a=r.room;r.token&&this.settings.rememberRoom(a.code,r.token),this.multiplayer={...this.multiplayer,code:a.code},this.setRoomInUrl(a.code),this.setLoadingText(`online.handover`);let o=await this.game.startOnline(r,this.settings.value.gameplay.defaultCamera);if(this.showLoading(!1),this.multiplayer={...this.multiplayer,busy:!1},!o){r.close();return}this.online=r,globalThis.breaklineOnline=r,r.onRefused=e=>this.failOnline(e),this.hideEndCard(),this.tracker.reset(),this.scene=`ride`,this.stack.reset(`ride`),this.show()}welcomed(e){return new Promise(t=>{let n=setTimeout(()=>t(`unreachable`),jh);e.onRefused=e=>{clearTimeout(n),t(e)},e.onWelcome=()=>{clearTimeout(n);let r=performance.now(),i=()=>{e.clockReady||performance.now()-r>Mh?t(`welcomed`):setTimeout(i,50)};i()}})}failOnline(e){this.showLoading(!1),this.leaveRoom(),this.multiplayer={...this.multiplayer,busy:!1,refusal:e},this.hideEndCard(),this.stack.reset(`menu`),this.stack.push(`multiplayer`),this.show()}leaveRoom(){let{online:e}=this;this.online=void 0,e?.close(),this.game.leaveOnline(),this.setRoomInUrl(void 0)}setRoomInUrl(e){if(typeof history>`u`)return;let t=new URL(location.href);e?t.searchParams.set(`room`,e):t.searchParams.delete(`room`),history.replaceState(history.state,``,t)}paddleOut=gh(()=>this.startSession());async startSession(){this.setLoadingText(`loading.paddleOut`),this.showLoading(!0);let{spot:e,conditions:t}=this.surfChoice,n=await this.game.startSurf(e,t,this.seed,this.settings.value.gameplay.defaultCamera);this.showLoading(!1),n&&(this.hideEndCard(),this.tracker.reset(),this.scene=`ride`,this.stack.reset(`ride`),this.show())}showLoading(e){this.loading.classList.toggle(`is-hidden`,!e),this.game.setCovered(e)}setLoadingText(e){this.loadingText&&(this.loadingText.textContent=Y(e))}hintText(e){if(this.touchActive())return e===`lean`?Y(`hint.lean`,{keys:`← →`}):e===`crouch`?Y(`hint.crouch`,{keys:Y(`touch.crouch`)}):e===`compress`?Y(`hint.compress`,{keys:Y(`touch.compress`)}):e===`reel`?Y(`hint.reel`,{keys:Y(`touch.popUp`)}):``;let{bindings:t}=this.settings.value.controls,n=this.controls.lastDevice===`gamepad`,r=this.controls.lastPadKind,i=e=>n?Ia(t.gamepad[e][0],r):Na(t.keyboard[e][0]),a=Y(Ga(`trimForward`,this.settings.value.controls)===`right`?`hud.rightStick`:`hud.stick`),o=e===`lean`?n?Y(`hud.stick`):`${i(`steerLeft`)} ${i(`steerRight`)}`:e===`trim`?n?a:`${i(`trimForward`)} ${i(`trimBack`)}`:i(e===`reel`?`popUp`:e);return o===`—`?``:Y(`hint.${e}`,{keys:o})}actionLabel=e=>{if(this.touchActive()){let t={paddle:`touch.paddle`,popUp:`touch.popUp`,crouch:`touch.crouch`,compress:`touch.compress`,steerLeft:`touch.left`,steerRight:`touch.right`}[e];return t?Y(t):`—`}let{bindings:t}=this.settings.value.controls;if(this.controls.lastDevice!==`gamepad`)return Na(t.keyboard[e][0]);let n=Ga(e,this.settings.value.controls);return n?Y(n===`right`?`hud.rightStick`:`hud.stick`):Ia(t.gamepad[e][0],this.controls.lastPadKind)};lessonScreen(){let e=this.lessonFlow,t=[this.rideHud.root];this.game.school.provisional&&t.push(Q(`p`,{class:`school-provisional`,text:`Provisional wave`}));let n=e?.lesson;if(n&&this.lessonOverlay===`card`&&t.push(Lp(Wp(n,this.actionLabel),{go:()=>void this.beginAttempt(),list:()=>this.toSchool()},e.state===`attempt`?`pause.resume`:`school.go`)),n&&this.lessonOverlay===`pass`){let e=Cp[Cp.indexOf(n)+1];t.push(Rp(Y(`lesson.${n.id}.title`),{...e?{next:()=>void this.switchLesson(e)}:{},again:()=>void this.againLesson(),list:()=>this.toSchool()}))}return this.lessonOverlay===`howto`&&t.push(zp(Cp.map(e=>Wp(e,this.actionLabel)),()=>{this.lessonOverlay=void 0,this.show()})),t}lessonFrame(e){let t=this.lessonFlow;if(!this.lessonOverlay){if(t.state===`attempt`){let e=this.game.school.frame();e&&t.frame(e),t.state===`passed`&&this.lessonPassed()}else if(t.state===`missed`){let n=t.tick(e);n===`restart`?this.restartAttempt():n===`card`&&(this.lessonOverlay=`card`,this.show())}}let n=this.game.rideStatus,r=this.hintKeys(),i=Gp(t,this.actionLabel,r.retry),a=n?.cue&&t.state===`attempt`?void 0:i.prompt;this.rideHud.update(n,this.settings.value.gameplay.units,r,!1,!0,i.coach,a),this.rideHud.updateStance(this.controls.lastRequest,n?.phase===`standing`,this.settings.value.gameplay.stanceReadout)}async openLesson(e,t=`pocket`){if(this.schoolBusy)return;this.schoolBusy=!0;let n=e?.start??t,r=e?.view??(n===`pocket`?`behind`:`front`);this.setLoadingText(`loading.school`),this.showLoading(!0);let i=!1;try{i=await this.game.school.enter(n,r,!e),this.schoolError=void 0}catch(e){console.warn(`The lesson wave did not load.`,e),this.schoolError=Y(`school.loadError`)}finally{this.showLoading(!1),this.schoolBusy=!1}if(!i){this.stack.current===`school`&&this.show();return}this.hideEndCard(),this.lessonStart=n,this.lessonFlow=new Hf(e,{start:n}),this.lessonFresh=!0,this.lessonOverlay=e?`card`:void 0,e||this.lessonFlow.start(),this.scene=`lesson`,this.stack.reset(`lesson`),this.show()}async beginAttempt(){let e=this.lessonFlow;e&&(this.lessonOverlay=void 0,e.state!==`attempt`&&(this.lessonFresh||await this.game.school.restart(this.lessonStart),e.start()),this.lessonFresh=!1,this.show())}async restartAttempt(){let e=this.lessonFlow;e&&(await this.game.school.restart(this.lessonStart),e.start(),this.lessonFresh=!1)}lessonPassed(){let e=this.lessonFlow?.lesson;e&&(this.schoolProgress.pass(e.id),e.hint&&this.hintBook.succeeded(e.hint),this.sound.playUi(`chime`),this.lessonOverlay=`pass`,this.show())}async againLesson(){this.lessonOverlay=void 0,await this.restartAttempt(),this.show()}async switchLesson(e){this.lessonStart=e.start,this.lessonFlow=new Hf(e),this.lessonOverlay=`card`,this.game.school.setView(e.view),await this.game.school.restart(e.start),this.lessonFresh=!0,this.show()}toSchool(){this.leaveLesson(),this.stack.reset(`menu`),this.stack.push(`school`),this.show()}leaveLesson(){this.lessonFlow&&(this.lessonFlow=void 0,this.lessonOverlay=void 0,this.game.school.leave())}hintKeys(){if(this.touchActive())return{paddle:Y(`touch.paddle`),popUp:Y(`touch.popUp`),retry:Y(`touch.retry`),steer:``,pause:``};let{bindings:e}=this.settings.value.controls,t=this.controls.lastDevice===`gamepad`,n=n=>t?Ia(e.gamepad[n][0],this.controls.lastPadKind):Na(e.keyboard[n][0]);return{paddle:n(`paddle`),popUp:n(`popUp`),retry:n(`retry`),steer:t?Y(`hud.stick`):`${n(`steerLeft`)} ${n(`steerRight`)}`,pause:n(`pause`)}}bindTouch(){let e=(e,t,n=!1)=>{let r=document.getElementById(e);r&&(n?r.setAttribute(`aria-label`,Y(t)):r.textContent=Y(t))};e(`touch-paddle`,`touch.paddle`),e(`touch-popup`,`touch.popUp`),e(`touch-crouch`,`touch.crouch`),e(`touch-compress`,`touch.compress`),e(`touch-left`,`touch.left`,!0),e(`touch-right`,`touch.right`,!0),document.getElementById(`touch-popup`)?.addEventListener(`pointerdown`,e=>{e.preventDefault(),this.controls.requestGetUp()})}touchActive(){let{touchControls:e}=this.settings.value.gameplay,t=typeof matchMedia==`function`&&matchMedia(`(pointer: coarse)`).matches;return e===`on`||e===`auto`&&t}applyAccessibility(){let{accessibility:e,controls:t}=this.settings.value;hu(this.root,e,this.touchActive(),t.handedness),this.game.setReducedMotion(e.reducedMotion)}needsRotateHint(){return!this.rotateDismissed&&this.touchActive()&&window.innerHeight>window.innerWidth}rotateHintElement(){return this.rotateHint??=Q(`button`,{class:`rotate-hint`,attrs:{type:`button`},text:Y(`hud.rotate`),on:{click:()=>{this.rotateDismissed=!0,this.rotateHint?.remove()}}}),this.rotateHint}enterWaveLab=gh(async()=>{this.setLoadingText(`loading.lab`),this.showLoading(!0);let e=await this.game.lab.enter(this.labStore.value);this.showLoading(!1),e&&(this.hideEndCard(),this.labDraft=structuredClone(this.labStore.value),this.labUiHidden=!1,this.scene=`wavelab`,this.stack.reset(`wavelab`),this.show())});createLabScreen(){let e=this.labDraft??structuredClone(this.labStore.value),t=this.game.lab.clock,n=()=>this.labScreen?.update(this.labView());return this.labScreen=mm({settings:e,running:this.labStore.value,devTools:!0,touch:this.touchActive(),units:this.settings.value.gameplay.units,scale:this.settings.value.gameplay.surfScale},{change:e=>{this.labDraft=e,this.game.lab.setLight(e),this.game.lab.setWaterLook(e.waterLook)},apply:e=>void this.rebuildLab(e,!1),newSea:e=>void this.rebuildLab(e,!0),follow:()=>{this.game.lab.toggleFollow(),n()},togglePause:()=>{t.togglePause(),n()},step:()=>t.step(),setScale:e=>{t.setScale(e),n()},jump:e=>this.game.lab.jump(e),hideUi:()=>this.toggleLabUi(),menu:()=>this.pause(),stick:(e,t)=>this.game.lab.input.setStick(e,t),rise:e=>this.game.lab.input.setRise(e),soundCheck:()=>Kp(()=>this.sound.audioEngine)}),this.labScreen.update(this.labView()),this.labScreen.root}surfWords(){let{gameplay:e,surfer:t}=this.settings.value;return{units:e.units,scale:e.surfScale,surferHeight:Ht(t.body)}}labView(){let{lab:e}=this.game;return{paused:e.clock.paused,scale:e.clock.scale,following:e.following,uiHidden:this.labUiHidden,info:e.info(this.settings.value.gameplay.units,this.surfWords()),readout:e.readout}}toggleLabUi(){this.stack.current===`wavelab`&&(this.labUiHidden=!this.labUiHidden,this.labScreen?.update(this.labView()))}async rebuildLab(e,t){if(!this.labRebuilding){this.labRebuilding=!0,this.setLoadingText(`loading.lab`),this.showLoading(!0);try{if(!await this.game.lab.apply(e,t))return;this.labStore.save(e),this.labDraft=structuredClone(e),this.labScreen?.setRunning(e)}finally{this.showLoading(!1),this.labRebuilding=!1}}}leaveWaveLab(){if(this.scene!==`wavelab`)return;let e=this.labDraft;e&&this.labStore.save({...this.labStore.value,sunHeight:e.sunHeight,sunDirection:e.sunDirection,waterLook:e.waterLook}),this.labScreen=void 0,this.labDraft=void 0,this.game.lab.leave()}openBackdrop(){this.scene=`backdrop`,this.backdropReady=!1,this.backdropSpot=ze(this.backdropSpot),this.root.classList.add(`is-scene-pending`),this.game.setCovered(!0),this.game.showBackdrop(this.backdropSpot).then(e=>{e&&(this.backdropReady=this.stack.base===`menu`,this.root.classList.remove(`is-scene-pending`),this.game.setCovered(!1),this.warmup=0,this.startBenchmarkIfNeeded())},e=>{throw this.game.setCovered(!1),e})}startBenchmarkIfNeeded(){let{graphics:e,detected:t}=this.settings.value;!this.benchmark&&Ro(e,t,this.adapter)&&(this.benchmark=new Lo,this.warmup=0)}finishBenchmark(){let e={...this.benchmark.result(),adapter:this.adapter};this.benchmark=void 0,this.settings.setDetected(e);let{graphics:t}=this.settings.value;t.preset===`auto`&&this.settings.update(`graphics`,ko(t,`auto`,e)),e.lowPerformance&&!this.settings.value.seen.lowPerformanceNotice&&this.showLowPerformanceNotice()}showLowPerformanceNotice(){let e=Q(`button`,{class:`strip-button`,attrs:{type:`button`},dataset:{nav:``},text:Y(`notice.dismiss`),on:{click:()=>{this.settings.markSeen(`lowPerformanceNotice`),this.notice?.remove(),this.notice=void 0,this.menuInput.focusDefault()}}});this.notice=Q(`aside`,{class:`notice`,attrs:{role:`status`}},Q(`h2`,{text:Y(`notice.lowPerformance.title`)}),Q(`p`,{text:Y(`notice.lowPerformance.body`)}),e),this.ui.append(this.notice)}},Ih={strafe:0,forward:0,rise:0,yaw:0,pitch:0,fast:!1},Lh={base:6,min:1,max:40,fastFactor:4,wheelStep:1.25},Rh=85*Math.PI/180,zh=.18,Bh=.3,Vh=class{position=new R;yaw=0;pitch=0;speed=Lh.base;velocity=new R;wanted=new R;direction=new R;right=new R;target=new R;forward(e){let t=Math.cos(this.pitch);return e.set(Math.sin(this.yaw)*t,Math.sin(this.pitch),Math.cos(this.yaw)*t)}update(e,t,n){this.yaw+=t.yaw,this.pitch=Math.min(Rh,Math.max(-Rh,this.pitch+t.pitch)),e>0&&(this.forward(this.direction),this.right.set(-Math.cos(this.yaw),0,Math.sin(this.yaw)),this.wanted.set(0,0,0).addScaledVector(this.direction,t.forward).addScaledVector(this.right,t.strafe),this.wanted.y+=t.rise,this.wanted.lengthSq()>1&&this.wanted.normalize(),this.wanted.multiplyScalar(this.speed*(t.fast?Lh.fastFactor:1)),this.velocity.lerp(this.wanted,1-Math.exp(-e/zh)),this.position.addScaledVector(this.velocity,e),this.clamp(n))}lookAt(e,t){this.position.copy(e);let n=this.target.subVectors(t,e);this.yaw=Math.atan2(n.x,n.z),this.pitch=Math.min(Rh,Math.max(-Rh,Math.atan2(n.y,Math.hypot(n.x,n.z)))),this.velocity.set(0,0,0)}translate(e,t,n){this.position.x+=e,this.position.y+=t,this.position.z+=n}scaleSpeed(e){this.speed=Math.min(Lh.max,Math.max(Lh.min,this.speed*Lh.wheelStep**e))}applyTo(e){e.position.copy(this.position),e.lookAt(this.target.copy(this.position).add(this.forward(this.direction)))}clamp(e){let t=this.position,n=this.velocity,r=(e,t,r,i)=>((e<t||e>r)&&(n[i]=0),Math.min(r,Math.max(t,e)));t.x=r(t.x,e.xMin,e.xMax,`x`),t.z=r(t.z,e.zMin,e.zMax,`z`),t.y=r(t.y,e.floor(t.x,t.z)+Bh,e.yMax,`y`)}},Hh=.35,Uh=.1,Wh=.5,Gh=4,Kh=30,qh=20;function Jh(e,t,n,r=30,i=Uh){let a=Math.floor(2*r/Wh)+1,o=new Float64Array(a),s=1/0;for(let i=0;i<a;i+=1)o[i]=e.height(t,n-r+i*Wh),s=Math.min(s,o[i]);let c;for(let l=1;l<a-1;l+=1){let a=o[l];if(!(a>o[l-1]&&a>=o[l+1]&&a-s>=i))continue;let u=o[l-1]-2*a+o[l+1],d=u<0?.5*(o[l-1]-o[l+1])/u:0,f=n-r+(l+d)*Wh;(!c||Math.abs(f-n)<Math.abs(c.z-n))&&(c={x:t,y:e.height(t,f),z:f})}return c}var Yh=class{point;lost=!1;speed=0;start(e,t,n){let r=Jh(e,t,n);return this.point=r??{x:t,y:e.height(t,n),z:n},this.lost=r===void 0,this.speed=0,!this.lost}update(e,t){let n={dx:0,dy:0,dz:0},r=this.point;if(!r||!(t>0))return n;let i=Jh(e,r.x,r.z+this.speed*t,Gh,0);if(!i)return this.lost=!0,n;this.lost=!1;let a=(i.z-r.z)/t;this.speed+=(a-this.speed)*Math.min(1,t/.25);let o=r.x+this.slide(e,i,t),s=Jh(e,o,i.z,Gh,0)??i,c={x:o,y:s.y,z:s.z},l={dx:c.x-r.x,dy:c.y-r.y,dz:c.z-r.z};return this.point=c,l}slide(e,t,n){let r=n=>e.foam(n,Jh(e,n,t.z,Gh,0)?.z??t.z)>=Hh,i=r(t.x);for(let e=1;e<=Kh;e+=1)for(let a of[1,-1])if(r(t.x+a*e)!==i){let t=a*(i?e:e-1),r=qh*n;return Math.max(-r,Math.min(r,t))}return 0}},Xh=400,Zh=1,Qh=40;function $h(e,t,n){let r=r=>e.y+t.y*r-n(e.x+t.x*r,e.z+t.z*r),i=Math.sign(r(0))||1,a=0;for(let n=Zh;n<=Xh;n+=Zh){if(Math.sign(r(n))===i){a=n;continue}let o=a,s=n;for(let e=0;e<20;e+=1){let e=.5*(o+s);Math.sign(r(e))===i?o=e:s=e}return{x:e.x+t.x*s,z:e.z+t.z*s}}let o=Math.hypot(t.x,t.z),s=o>1e-6?t.x/o:0,c=o>1e-6?t.z/o:-1;return{x:e.x+s*Qh,z:e.z+c*Qh}}function eg(e,t,n,r=40){let i=n,a=-1/0;for(let o=-r/2;o<=r/2;o+=.5){let r=e(t,n+o);r>a&&(a=r,i=n+o)}let o=1/0;for(let n=0;n<=r;n+=.5)o=Math.min(o,e(t,i-n));let s=a-o;return s>=.05?s:void 0}function tg(e){if(!e)return{text:Y(`lab.info.waiting`)};let t=je(e.angleDegrees);if(t===`closeout`)return{text:Y(`lab.peel.closeout`)};if(e.fit<.3)return{text:Y(`lab.peel.mixed`)};let n=Math.round(e.angleDegrees);return{text:Y(e.direction>0?`lab.peel.left`:`lab.peel.right`,{angle:n}),skill:Y(`lab.skill.${t}`)}}function ng(e,t,n={scale:`face`,surferHeight:mt}){let r=Y(`lab.breaker.${e.breaker}`),i=tg(e.peel),a=e.steady?Y(`lab.info.steady`):e.timeToSet>0?Y(`lab.info.setIn`,{seconds:Math.round(e.timeToSet)}):Y(`lab.info.setNow`);return{summary:[r,i.text,i.skill].filter(Boolean).join(` · `),rows:[{label:Y(`lab.info.surf`),value:K(e.surf,{...n,units:t})},{label:Y(`lab.info.face`),value:e.face===void 0?Y(`lab.info.noFace`):Xd(e.face,t)},{label:Y(`lab.info.period`),value:`${Math.round(e.period)} s`},{label:Y(`lab.info.breaker`),value:r},{label:Y(`lab.info.peel`),value:i.text},{label:Y(`lab.info.breaking`),value:`${Math.round(e.breakingFraction*100)} %`},{label:Y(`lab.info.nextSet`),value:a}]}}var rg=80,ig=100,ag=120,og={1:`overview`,2:`profile`,3:`below`},sg=class{clock=new Yp;fly=new Vh;following=!1;active=!1;tracker=new Yh;cinematic=!1;direction=new R;target=new R;begin(e){e.idleView=`free`,this.clock.paused=!1,this.clock.scale=1,this.following=!1,this.jump(e,1)}end(e){this.following=!1,this.cinematic=!1,this.clock.paused=!1,this.clock.scale=1,e.idleView=`overview`}jump(e,t){this.following=!1;let{host:n}=e;if(n){if(t===4){e.camera.setView(`cinematic`),this.cinematic=!0;return}this.cinematic=!1,e.camera.setView(og[t]),e.camera.update(n,e.focus,0),this.takePose(e)}}frame(e,t,n){let r=this.clock.advance(t),{host:i}=e;if(!i)return r;if(this.cinematic){if(n.strafe===0&&n.forward===0&&n.rise===0&&n.yaw===0&&n.pitch===0)return r;this.cinematic=!1,this.takePose(e)}if(this.fly.update(t,n,this.bounds(i)),this.following){let e=this.tracker.update(this.field(i),r);this.fly.translate(e.dx,e.dy,e.dz)}return this.fly.applyTo(e.camera.camera),r}toggleFollow(e){let{host:t}=e;if(this.following||!t)return this.following=!1,!1;this.cinematic&&(this.cinematic=!1,this.takePose(e));let n=this.underView(e);return this.following=this.tracker.start(this.field(t),n.x,n.z),this.following}info(e,t,n){let{host:r,config:i}=e;if(!r||!i)return;let a=this.underView(e),{status:o}=r.snapshot;return ng({face:eg((e,t)=>r.heightAt(e,t),a.x,a.z),period:i.peakPeriod,breaker:o.breaker.type,peel:o.peel,breakingFraction:o.breakingFraction,timeToSet:o.timeToSet,steady:e.practice,surf:o.surf},t,n)}underView(e){let{camera:t}=e.camera,n=e.host;return t.updateMatrixWorld(),$h(t.position,t.getWorldDirection(this.direction),(e,t)=>n.heightAt(e,t))}takePose(e){let{camera:t}=e.camera;t.updateMatrixWorld(),this.fly.lookAt(t.position,this.target.copy(t.position).add(t.getWorldDirection(this.direction))),e.camera.setView(`free`)}bounds(e){let{grid:t,windowXMin:n}=e.init;return{xMin:n-rg,xMax:n+(t.nx-1)*t.spacing+rg,zMin:t.zMin,zMax:t.zMin+(t.nz-1)*t.spacing+ig,yMax:ag,floor:(t,n)=>e.bedAt(t,n)}}field(e){return{height:(t,n)=>e.heightAt(t,n),foam:(t,r)=>n(e.snapshot.surface,e.init.grid,t,r)}}},cg=.004,lg=2.2,ug=new Set([`Space`,`Enter`,`NumpadEnter`]),dg=new Set([`ArrowLeft`,`ArrowRight`,`ArrowUp`,`ArrowDown`,`Home`,`End`,`PageUp`,`PageDown`]);function fg(e,t){if(t===`Escape`)return!1;let n=e,r=n?.tagName;return r===`BUTTON`?ug.has(t):r===`INPUT`&&n?.type===`range`?dg.has(t):r===`INPUT`||r===`SELECT`||r===`TEXTAREA`}var pg={KeyW:{axis:`forward`,sign:1},ArrowUp:{axis:`forward`,sign:1},KeyS:{axis:`forward`,sign:-1},ArrowDown:{axis:`forward`,sign:-1},KeyD:{axis:`strafe`,sign:1},ArrowRight:{axis:`strafe`,sign:1},KeyA:{axis:`strafe`,sign:-1},ArrowLeft:{axis:`strafe`,sign:-1},KeyE:{axis:`rise`,sign:1},KeyQ:{axis:`rise`,sign:-1}},mg=new Set([`KeyF`,`KeyH`,`Space`,`Period`,`BracketLeft`,`BracketRight`,`Escape`,`Digit1`,`Digit2`,`Digit3`,`Digit4`]),hg={a:0,x:2,y:3,lb:4,rb:5,lt:6,rt:7,start:9,up:12,down:13,left:14,right:15};function gg(e){let t=e??0;return Math.abs(t)<.15?0:t}var _g=class{actions;held=new Set;active=!0;dragging=!1;lastX=0;lastY=0;lookX=0;lookY=0;stick={x:0,y:0};touchRise=0;pad;padPrevious=new Set;pads;constructor(e,t={}){this.actions=e;let n=t.keys??globalThis.window;this.pads=t.pads??(()=>Ea()),n?.addEventListener(`keydown`,e=>this.keyDown(e)),n?.addEventListener(`keyup`,e=>{this.held.delete(e.code)}),n?.addEventListener(`blur`,()=>this.release());let r=t.surface;r?.addEventListener(`pointerdown`,e=>{if(!this.active)return;let t=e;this.dragging=!0,this.lastX=t.clientX,this.lastY=t.clientY,t.target?.setPointerCapture?.(t.pointerId)}),r?.addEventListener(`pointermove`,e=>{if(!this.dragging||!this.active)return;let t=e;this.lookX+=t.clientX-this.lastX,this.lookY+=t.clientY-this.lastY,this.lastX=t.clientX,this.lastY=t.clientY});for(let e of[`pointerup`,`pointercancel`,`lostpointercapture`])r?.addEventListener(e,()=>{this.dragging=!1});r?.addEventListener(`wheel`,e=>{if(!this.active)return;let t=e;t.preventDefault?.(),t.deltaY!==0&&this.actions.speed(t.deltaY<0?1:-1)},{passive:!1})}get enabled(){return this.active}set enabled(e){this.active=e,e||this.release()}setStick(e,t){this.stick={x:e,y:t}}setRise(e){this.touchRise=e}poll(){let e=this.pads()[0];this.pad=this.active?e:void 0;let t=new Set;if(e?.buttons.forEach((e,n)=>{e&&t.add(n)}),this.active)for(let e of t)this.padPrevious.has(e)||this.padPress(e);this.padPrevious=t}read(e){if(!this.active)return{...Ih};let t={...Ih,fast:this.held.has(`ShiftLeft`)||this.held.has(`ShiftRight`)};for(let e of this.held){let n=pg[e];n&&(t[n.axis]+=n.sign)}t.strafe+=this.stick.x,t.forward+=this.stick.y,t.rise+=this.touchRise;let n=this.pad;n&&(t.strafe+=gg(n.axes[0]),t.forward-=gg(n.axes[1]),t.rise+=Number(n.buttons[hg.rt]??!1)-Number(n.buttons[hg.lt]??!1),t.fast||=!!n.buttons[hg.lb],t.yaw-=gg(n.axes[2])*lg*e,t.pitch-=gg(n.axes[3])*lg*e),t.yaw-=this.lookX*cg,t.pitch-=this.lookY*cg,this.lookX=0,this.lookY=0;for(let e of[`strafe`,`forward`,`rise`])t[e]=Math.max(-1,Math.min(1,t[e]));return t}keyDown(e){!fg(e.target,e.code)&&this.active&&((pg[e.code]||mg.has(e.code))&&e.preventDefault?.(),!e.repeat&&!this.held.has(e.code)&&this.keyPress(e.code),this.held.add(e.code))}keyPress(e){let{actions:t}=this;e===`KeyF`?t.follow():e===`KeyH`?t.hideUi():e===`Space`?t.togglePause():e===`Period`?t.step():e===`BracketLeft`?t.slower():e===`BracketRight`?t.faster():e===`Escape`?t.pause():/^Digit[1-4]$/.test(e)&&t.jump(Number(e.slice(5)))}padPress(e){let{actions:t}=this;e===hg.a?t.togglePause():e===hg.x?t.hideUi():e===hg.y?t.follow():e===hg.rb?t.step():e===hg.start?t.pause():e===hg.up?t.jump(1):e===hg.right?t.jump(2):e===hg.down?t.jump(3):e===hg.left&&t.jump(4)}release(){this.held.clear(),this.dragging=!1,this.lookX=0,this.lookY=0,this.stick={x:0,y:0},this.touchRise=0,this.pad=void 0}},vg=[{stage:2,config:{spot:`pool`,seed:1,significantHeight:1.145512985522207,peakPeriod:10,directionDegrees:0,spreading:1e3,tide:0,windSpeed:0,componentCount:1},assets:{pocket:`lessons/pool-s2-pocket.sea`,caught:`lessons/pool-s2-caught.sea`,waiting:`lessons/pool-s2-waiting.sea`},placements:{pocket:{x:28.11,z:-161.82,heading:.711,speed:8.42,phase:`standing`},caught:{x:27.19,z:-176.2,heading:.236,speed:1.81,phase:`prone`},waiting:{x:26.92,z:-188.34,heading:-.048,speed:.48,phase:`prone`}},provisional:!1,checks:{pocket:`stood 4.3 s (attempt 12)`,caught:`stood 9.6 s (attempt 12)`,waiting:`stood 2.6 s (attempt 5)`}}],yg={sea:`waiting`,along:33};function bg(e){return e===`inside`?yg.sea:e}function xg(e,t){if(t!==`inside`)return e.placements[t];let n=e.placements[yg.sea],r=e.config.directionDegrees*Math.PI/180,i=Math.sin(r),a=Math.cos(r);return{x:n.x+i*yg.along,z:n.z+a*yg.along,heading:Math.atan2(-i,-a),speed:0,phase:`prone`}}function Sg(e){return{...e.config,stage:e.stage,compute:`auto`,spinUpPeriods:0}}function Cg(e=vg){let t=e.find(e=>e.stage===2);if(!t)throw Error(`No stage 2 lesson wave recorded`);return t}async function wg(e,t,n=globalThis.fetch.bind(globalThis)){let r=e.assets[bg(t)],i=await n(r);if(!i.ok)throw Error(`The lesson wave ${r} did not load (${i.status})`);return f(new Uint8Array(await i.arrayBuffer()),!0)}var Tg=class{wave;seas=new Map;waves;load;constructor(e={}){this.waves=e.waves??vg,this.load=e.load??((e,t)=>wg(e,t))}async prepare(e){let t=Cg(this.waves);this.wave!==t&&(this.seas.clear(),this.wave=void 0);let n=await this.sea(t,e);return this.wave=t,{wave:t,sea:n.slice()}}async restart(e,t){let{wave:n}=this;if(!n)throw Error(`No lesson wave prepared`);return e.restore((await this.sea(n,t)).slice()),xg(n,t)}async sea(e,t){let n=bg(t),r=this.seas.get(n);if(r)return r;let i=await this.load(e,n);return this.seas.set(n,i),i}},Eg=`modulepreload`,Dg=function(e){return`/`+e},Og={},kg=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href}r=o(t.map(t=>{if(t=Dg(t,n),t=s(t),t in Og)return;Og[t]=!0;let r=t.endsWith(`.css`);for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}let i=document.createElement(`link`);if(i.rel=r?`stylesheet`:Eg,r||(i.as=`script`),i.crossOrigin=``,i.href=t,a&&i.setAttribute(`nonce`,a),document.head.appendChild(i),r)return new Promise((e,n)=>{i.addEventListener(`load`,e),i.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},Ag=Xe(`demo`),jg=St[vt],Mg=1.5,Ng=We(`physical`)||Ag!==null,Pg=We(`record`),Fg=We(`waterSheet`),Ig=We(`particleBench`),Lg=(Fg||Pg)&&[`gpu`,`auto`].includes(Xe(`compute`)??``),Rg=typeof Worker>`u`||We(`inpage`)&&!Lg;function zg(e,t){let n=Number(Xe(`renderSpacing`))||void 0;return Rg?(r,i)=>new g(r,{rider:e,renderSpacing:n,stance:t,...i}):(r,i)=>new jt(r,void 0,{rider:e,renderSpacing:n,stance:t,...i})}function Bg(e,t){return Rg?(n,r)=>new g(n,{rider:!0,stance:t,...r},e):(n,r)=>new jt(n,void 0,{rider:!0,stance:t,...r},{sea:e})}function Vg(e,t,n){return Rg?(r,i)=>new g(r,{rider:!0,stance:n,...e,...i},t):(r,i)=>new jt(r,void 0,{rider:!0,stance:n,...e,...i},{maxQueuedSteps:180,...t?{sea:t}:{}})}var Hg=Rg?void 0:xe;function Ug(e){let t=document.querySelector(e);if(!t)throw Error(`Missing required app element: ${e}`);return t}function Wg(){try{return window.localStorage}catch{return}}var Gg=new class{scene=new u;renderer;environment=new xc;sunlight;ambient=new i(`#d8d9cd`,1.5);fill=new B(`#76c6d3`,.8);photoSky;shadows;shadowSurfaces;shadowSun=new R;shadowNose=new R;reflectionMapTarget;water;caustics;fftChop=new nl;causticAhead=new R;seed=1;accumulator=0;previousFrame=0;waveLab=new sg;labInput;lab;schoolSession=new Tg;schoolActive=!1;schoolFreePractice=!1;schoolSlow=!1;schoolSeaTime=NaN;school;demoPilot=Ag===null?void 0:new Ql({style:Ag===`line`?`line`:`turns`});demoDone=0;fixedStep=1/60;isBelowSurface=!1;underwaterFog=new Mt(`#367e83`,.035);underwaterColor=new N(`#367e83`);skyColor=new N(`#b8e3e5`);physicalMode;physicalSettings={...qt};frozen=!1;freezeIn;needsRender=!0;get timeScale(){return this.waveLab.active?this.waveLab.clock.scale:this.schoolActive&&this.schoolSlow?.5:1}paused=!1;stillFrame=new bc;covered=!1;soundSeaTime=NaN;soundBoard;soundSideslip=0;soundPhase;soundDuck=0;soundSnapped;listenerForward=new R;online;showNameTags=!0;pocketReflex=`practice`;surfSwell=`practice`;stance=`regular`;shownSun={height:jg.sunHeight,direction:jg.sunDirection};graphics;lastRender=0;constructor(){this.renderer=new ga({antialias:!0,powerPreference:`high-performance`}),this.renderer.setPixelRatio(this.pixelRatio()),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.outputColorSpace=`srgb`,this.renderer.toneMapping=7,this.renderer.toneMappingExposure=1.05,this.renderer.domElement.tabIndex=0,this.renderer.domElement.setAttribute(`aria-label`,`Surf game canvas. Click here to use keyboard controls.`),Ug(`#scene`).append(this.renderer.domElement),this.labInput=new _g({follow:()=>this.waveLab.toggleFollow(this.physicalMode),jump:e=>this.waveLab.jump(this.physicalMode,e),hideUi:()=>this.lab.onAction?.(`hide`),togglePause:()=>this.waveLab.clock.togglePause(),step:()=>this.waveLab.clock.step(),slower:()=>this.waveLab.clock.slower(),faster:()=>this.waveLab.clock.faster(),pause:()=>this.lab.onAction?.(`menu`),speed:e=>this.waveLab.fly.scaleSpeed(e)},{surface:this.renderer.domElement}),this.labInput.enabled=!1,globalThis.breaklineLab=this.waveLab,this.scene.background=new N(`#b8e3e5`),this.scene.add(this.environment.group),this.scene.add(this.ambient),this.sunlight=new B(`#ffe7bd`,1.2+.6*jg.sunHeight),this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45),this.scene.add(this.sunlight),this.fill.position.set(8,4,-10),this.scene.add(this.fill),this.photoSky=new jc(this.renderer),this.water=new lt(new rl),this.water.mesh.material.envMapIntensity=.28,this.water.mesh.visible=!1,this.scene.add(this.water.mesh),this.physicalMode=new Ie(this.scene),this.physicalMode.farField.mesh.material.envMapIntensity=.28,this.caustics=new ie(this.water.causticSource,this.water.causticUniforms),this.physicalMode.seabed.useCaustics(this.water.causticUniforms,this.water.causticSource),this.physicalMode.spray.useWater(this.water.causticSource),this.lab=this.labHost(),this.school=this.schoolHost(),this.shadows=new Gc(this.renderer,this.sunlight,this.scene),this.shadowSurfaces=[this.water.mesh,this.physicalMode.seabed.mesh,this.physicalMode.farField.mesh],this.shadows.setLevel(Nc(window.location.search),{surfaces:this.shadowSurfaces}),this.refreshSun(),this.refreshReflection(),this.applySun(jg),this.resize(),window.addEventListener(`resize`,()=>this.resize()),Ug(`#loading`).classList.add(`is-hidden`),!Pg&&!Fg&&!Ig&&requestAnimationFrame(this.frame)}get recording(){return{start:async(e,t,n={})=>{await this.startPhysical(this.seed,e,{...n,...t?{overrides:t}:{}}),Ug(`#loading`).classList.add(`is-hidden`)},step:e=>this.physicalMode.advance(1,e),retry:()=>this.physicalMode.retry(),render:(e,t)=>this.physicalRender(e,t),resize:(e,t)=>{this.renderer.setPixelRatio(1),this.renderer.setSize(e,t,!1),this.physicalMode.camera.resize(e/t)},mode:this.physicalMode,canvas:this.renderer.domElement,setWaterLook:e=>this.applyWaterLook(e),setTimeOfDay:e=>this.applySun(St[e]),setSun:e=>this.applySun(e),renderView:e=>{let t=this.physicalMode.host;this.setUnderwater(t!==void 0&&e.position.y<t.heightAt(e.position.x,e.position.z)-.1),this.drawPhysical(e)},water:this.water}}onFrame;get canvas(){return this.renderer.domElement}get gl(){return this.renderer.getContext()}setSurfer(e){let t=et.find(e=>e.id===Xe(`surfer`))?.id;this.physicalMode.setSurfer(t?{...e,body:t}:e)}applyGraphics(e){this.graphics=e,this.needsRender=!0,this.resize(),e.caustics||this.caustics.disable(),this.physicalMode.setSprayVisible(e.sprayMist),this.physicalMode.setParticleLevel(e.particles),this.physicalMode.farField.setViewDistance(e.oceanView),this.water.setFoamDetail(e.detailedFoam);let t=Nc(window.location.search,e.shadows);t!==this.shadows.currentLevel&&this.shadows.setLevel(t,{surfaces:this.shadowSurfaces});let n=jo(e);this.physicalMode.surfer.setDetail(n.lodDistance,n.textureCap),this.online?.views.setDetail(e.surferLodDistance,e.textureCap),this.applyWaterLook(e.waterLook)}quickRetry=()=>{if(this.online){this.online.play.respawn();return}this.physicalMode.retry()};async startPhysical(e,t,n={}){let r=n.factory??zg(n.rider??!0,this.stance),i=n.overrides||this.graphics?.richSea===!1?void 0:Hg;if(!await this.physicalMode.start(t,e,this.water,n.overrides??{},r,i))return!1;this.frozen=!1,this.freezeIn=void 0,n.lab||this.leaveLab(),this.waveLab.active=n.lab===!0,n.school||this.leaveSchool(),this.schoolActive=n.school===!0,this.seed=e,this.physicalSettings={...t},this.water.mesh.visible=!0,this.physicalMode.setVisible(!0),this.physicalMode.camera.setView(this.physicalMode.homeView),this.environment.group.scale.setScalar(5),this.environment.group.position.set(this.physicalMode.focus.x,0,this.physicalMode.focus.z);let{sun:a}=n;return a&&(a.sunHeight!==this.shownSun.height||a.sunDirection!==this.shownSun.direction)&&this.applySun(a),this.accumulator=0,!0}async showBackdrop(e){this.leaveOnline(),this.physicalMode.idleView=`cinematic`;let t={stage:this.graphics?.stage??2,compute:this.graphics?.compute??`auto`};return await this.startPhysical(this.seed,kt(e,t),{sun:St.sunset,rider:!1})?(this.graphics?.stillBackdrop&&(this.freezeIn=Mg),!0):!1}async startSurf(e,t,n,r){this.leaveOnline(),this.surfSwell=Ve(e,t.swell)?`practice`:t.swell,this.physicalMode.idleView=`overview`,this.physicalMode.defaultView=r;let i={stage:this.graphics?.stage??2,compute:this.graphics?.compute??`auto`};return this.startPhysical(n,ft(e,t,i),{sun:St[t.time],rider:!0})}get rideStatus(){return this.physicalMode.host?.snapshot.status.ride}setReducedMotion(e){this.physicalMode.camera.setReducedMotion(e)}get readout(){return this.physicalMode.readout()}async startOnline(e,t=`front`){let n=e.room;if(!n)return!1;this.physicalMode.idleView=`overview`,this.physicalMode.defaultView=t;let r=ft(n.spot,n.conditions,{stage:2,compute:`auto`}),i={spawnAlong:(Math.random()-.5)*40,spawnOut:10+Math.random()*15},a=await e.requestSea(),o=a?await f(a.bytes,a.deflated):void 0;if(e.closed)return!1;let s={stage:2,compute:`auto`,componentCount:64,startSeaTime:e.seaTimeNow(),...o?{spinUpPeriods:0}:{}};if(!await this.startPhysical(n.seed,r,{sun:St[n.conditions.time],rider:!0,factory:Vg(i,o,this.stance),overrides:s}))return!1;if(this.online?.controller===e)return this.online.play.restart(),this.online.rebuilding=!1,!0;this.leaveOnline();let c=new fc(this.scene);return this.graphics&&c.setDetail(this.graphics.surferLodDistance,this.graphics.textureCap),this.online={controller:e,play:new Vs(e),views:c,tags:new _c(Ug(`#app`)),state:Js(),anchors:[],rebuilding:!1},e.provideSea=async()=>this.online?.controller===e?this.physicalMode.host?.exportState():void 0,!0}leaveOnline(){let{online:e}=this;e&&(e.views.dispose(),e.tags.dispose(),this.online=void 0)}get onlineState(){let{online:e}=this;return e&&{phase:e.rebuilding?`resyncing`:e.play.phase,behind:e.play.behind,respawnIn:e.play.respawnIn}}setNameTags(e){this.showNameTags=e}setPocketReflex(e){this.pocketReflex=e}setStance(e){this.stance=e,this.physicalMode.stance=e}setPaused(e){e!==this.paused&&this.stillFrame.reset(),this.paused=e}setCovered(e){this.covered=e,this.needsRender=!0}get rideFrame(){let e=this.physicalMode.host,t=e?.snapshot.status.ride;if(!e||!t)return;let{board:n,status:r}=e.snapshot;return{phase:t.phase,speed:t.speed,resets:t.resets,separation:t.separation,seaTime:r.seaTime,x:n[0],z:n[2],report:t.report,timeScale:this.timeScale}}soundFrame(e,t){let n=this.physicalMode.host;if(!n){this.soundSeaTime=NaN,this.soundPhase=void 0;return}let{snapshot:r}=n,{status:i}=r,a=i.seaTime-this.soundSeaTime,o=a!==0;this.soundSeaTime=i.seaTime;let s=r.board,c;if(s[7]>0){let[e,t,n,r,l,u,d]=s;if(o&&a>0&&this.soundBoard){let i=1-2*(l*l+u*u),o=2*(r*l+d*u),s=2*(r*u-d*l);this.soundSideslip=Math.abs(((e-this.soundBoard.x)*i+(t-this.soundBoard.y)*o+(n-this.soundBoard.z)*s)/a)}this.soundBoard={x:e,y:t,z:n},c={x:e,y:t,z:n,speed:i.ride?.boardSpeed??i.board?.speed??0,sideslip:this.soundSideslip}}else this.soundBoard=void 0,this.soundSideslip=0;let l=i.ride,u=this.soundPhase??l?.phase;this.soundPhase=l?.phase;let d=this.soundDuck;this.soundDuck=l?.duck??0;let f=this.soundSnapped??l?.leash.snapped??!1;this.soundSnapped=l?.leash.snapped;let p=this.physicalMode.camera.camera;return{dt:e,timeScale:this.timeScale,paused:t||this.waveLab.active&&this.waveLab.clock.paused,listener:{x:p.position.x,y:p.position.y,z:p.position.z,underwater:this.physicalMode.cameraBelowSurface()},roar:r.roar,lipHits:r.lipHits,lipHitCount:o?r.lipHitCount:0,strokeHits:r.strokeHits,strokeHitCount:o?r.strokeHitCount:0,significantHeight:this.physicalMode.config?.significantHeight??0,windSpeed:this.physicalMode.config?.windSpeed??0,...c?{board:c}:{},...l&&u?{ride:{phase:l.phase,previousPhase:u,speed:l.boardSpeed,duck:l.duck,previousDuck:d,leashSnapped:l.leash.snapped,previouslySnapped:f,knock:o?l.knock:0,headUnder:l.phase===`fallen`&&(r.rider[z.swim]&te.under)!==0}}:{}}}get listenerPose(){let{camera:e}=this.physicalMode.camera,t=e.getWorldDirection(this.listenerForward);return{x:e.position.x,y:e.position.y,z:e.position.z,forward:{x:t.x,y:t.y,z:t.z}}}get viewName(){return this.physicalMode.camera.view}get backdropRunning(){return this.physicalMode.ready&&!this.frozen&&this.freezeIn===void 0}cycleView=()=>{this.physicalMode.nextView(),this.focusGame()};frame=e=>{if(!wo(e,this.lastRender,this.graphics?.frameInterval??0)){requestAnimationFrame(this.frame);return}this.lastRender=To(e,this.lastRender,this.graphics?.frameInterval??0),Zg.poll(),this.labInput.poll();let t=this.previousFrame===0?0:(e-this.previousFrame)/1e3;if(this.onFrame?.(t*1e3,this.physicalMode.host?.snapshot.status),this.covered){this.previousFrame=e,requestAnimationFrame(this.frame);return}if(this.paused&&!this.online){this.pausedRender(e),requestAnimationFrame(this.frame);return}let n=Math.min(t,.1);this.previousFrame=e;let r=ds(n,this.timeScale);this.freezeIn!==void 0&&(this.freezeIn-=n,this.freezeIn<=0&&(this.freezeIn=void 0,this.frozen=!0)),this.frozen?this.needsRender&&this.physicalRender(0):this.physicalFrame(n,r),this.needsRender=!1,requestAnimationFrame(this.frame)};physicalFrame(e,t){if(this.online){this.onlineFrame(e);return}if(this.waveLab.active){this.labFrame(e);return}this.accumulator=Math.min(this.accumulator+t,this.fixedStep*4);let n=0;for(;this.accumulator>=this.fixedStep&&n<3;)this.accumulator-=this.fixedStep,n+=1;if(this.demoPilot){this.demoFrame(this.demoPilot,n,e),this.physicalRender(t);return}let r=this.physicalMode.host?.snapshot.status.ride?.phase===`standing`,i=Zg.rideRequest(t,r),a=this.schoolActive?h(this.pocketReflex,this.schoolFreePractice):le(this.pocketReflex,this.surfSwell);this.physicalMode.advance(n,{...i,...this.boardAxes(i),pocketReflex:a}),i.popUp&&Zg.consumeGetUp(),this.physicalRender(t)}boardAxes(e){let{physicalMode:t}=this;return{steer:t.screenSteer(e.steer),rotate:e.rotate===void 0?void 0:t.screenSteer(e.rotate)}}labFrame(e){let t=this.waveLab.frame(this.physicalMode,e,this.labInput.read(e));this.accumulator=Math.min(this.accumulator+t,this.fixedStep*4);let n=0;for(;this.accumulator>=this.fixedStep-1e-9&&n<3;)this.accumulator-=this.fixedStep,n+=1;this.physicalMode.advance(n),this.physicalRender(t)}labHost(){let{waveLab:e}=this,t=()=>this.physicalMode;return{onAction:void 0,input:this.labInput,clock:e.clock,get following(){return e.following},get readout(){return t().readout()},enter:e=>this.enterLab(e),apply:async(n,r)=>{r&&(this.seed=this.seed%9999+1);let{fly:i,clock:a}=e,o={position:i.position.clone(),yaw:i.yaw,pitch:i.pitch,paused:a.paused,scale:a.scale};return await this.enterLab(n)?(t().camera.view===`free`&&(i.position.copy(o.position),i.yaw=o.yaw,i.pitch=o.pitch,i.applyTo(t().camera.camera)),a.paused=o.paused,a.scale=o.scale,!0):!1},setLight:e=>{(e.sunHeight!==this.shownSun.height||e.sunDirection!==this.shownSun.direction)&&this.applySun(e)},setWaterLook:e=>this.applyWaterLook(e),leave:()=>this.leaveLab(),toggleFollow:()=>e.toggleFollow(t()),jump:n=>e.jump(t(),n),info:(n,r)=>e.info(t(),n,r)}}async enterLab(e){this.leaveOnline();let t={stage:this.graphics?.stage??2,compute:this.graphics?.compute??`auto`},n={...e.physical,...rm(e,t,!0)};return await this.startPhysical(this.seed,n,{sun:e,rider:!1,lab:!0})?(this.waveLab.begin(this.physicalMode),this.applyWaterLook(e.waterLook),!0):!1}schoolHost(){let e=this;return{enter:(e,t,n)=>(this.schoolFreePractice=n,this.enterSchool(e,t)),restart:async e=>{let t=this.physicalMode.host;t&&this.schoolActive&&(this.placeRider(await this.schoolSession.restart(t,e)),this.schoolSeaTime=NaN)},setSlowMotion:e=>{this.schoolSlow=e},setView:e=>this.physicalMode.setRideView(e),get slowMotion(){return e.schoolSlow},frame:()=>this.schoolFrame(),get provisional(){return e.schoolSession.wave?.provisional??!0},leave:()=>this.leaveSchool()}}async enterSchool(e,t){this.leaveOnline();let{wave:n,sea:r}=await this.schoolSession.prepare(e),i={...qt,spot:n.config.spot,stage:n.stage,compute:`auto`,source:`practice`,tide:n.config.tide,windSpeed:n.config.windSpeed};return this.physicalMode.idleView=`overview`,this.physicalMode.defaultView=t,await this.startPhysical(n.config.seed,i,{sun:St.midday,rider:!0,factory:Bg(r,this.stance),overrides:Sg(n),school:!0})?(this.placeRider(xg(n,e)),this.schoolSeaTime=NaN,!0):!1}placeRider(e){this.physicalMode.place(e),this.physicalMode.advance(1)}schoolFrame(){let e=this.physicalMode.host,t=e?.snapshot.status.ride;if(!e||!t||!this.schoolActive)return;let{seaTime:n}=e.snapshot.status,r=Number.isFinite(this.schoolSeaTime)?Math.max(0,n-this.schoolSeaTime):0;this.schoolSeaTime=n;let i=Zg.lastRequest;return{dt:r,phase:t.phase,speed:t.speed,heading:e.snapshot.rider[z.heading],input:{steer:i.steer,trim:i.trim??0,crouch:i.crouch??0,compress:i.compress??0,hand:i.hand??!1,paddle:i.paddle},wave:{valid:t.wave.valid,faceFraction:t.wave.faceFraction,crestBreaking:t.wave.crestBreaking,aheadOfCrest:t.wave.aheadOfCrest},x:e.snapshot.board[0],z:e.snapshot.board[2],seaward:{x:-t.wave.directionX,z:-t.wave.directionZ},...t.live?{live:{kind:t.live.kind,start:t.live.start}}:{},...t.separation?{separation:t.separation}:{},...t.report?{report:{id:t.report.id,end:t.report.end}}:{}}}leaveSchool(){this.schoolActive=!1,this.schoolSlow=!1,this.schoolSeaTime=NaN}leaveLab(){this.waveLab.active&&(this.waveLab.active=!1,this.labInput.enabled=!1,this.waveLab.end(this.physicalMode),this.applyWaterLook(this.graphics?.waterLook??`rich`))}demoFrame(e,t,n){let r=this.physicalMode.host,i=r&&il(r,this.physicalMode.focus.z,this.physicalSettings.tide);this.physicalMode.advance(t,i?e.next(i,t*x):void 0),this.demoDone=e.state===`done`?this.demoDone+n:0,this.demoDone>2&&(this.demoDone=0,e.reset(),this.physicalMode.retry())}onlineFrame(e){let t=this.online,n=this.physicalMode.host?.snapshot.status.ride?.phase===`standing`,r=this.paused?void 0:Zg.rideRequest(e,n),i=r&&{...r,...this.boardAxes(r)},{resync:a}=t.play.step(this.physicalMode,e,i);r?.popUp&&Zg.consumeGetUp(),a&&!t.rebuilding&&(t.rebuilding=!0,this.startOnline(t.controller,this.physicalMode.defaultView).then(e=>{!e&&this.online===t&&(t.rebuilding=!1)})),this.physicalRender(e)}drawOnline(){let{online:e}=this,t=this.physicalMode.host;if(!e||!t)return;let{controller:n,views:r,tags:i,state:a,anchors:o}=e;n.prune();let s=n.players().filter(e=>e.id!==n.you);r.sync(s);let c=this.physicalMode.camera.camera,l=t.snapshot.status.seaTime-Hs,u=(e,n)=>t.heightAt(e,n),d=[],f=()=>(o[d.length]??=new R,o[d.length]);for(let e of s){let t=n.remote.sample(e.id,l,a);r.update(e.id,t?a:void 0,u,c.position,l);let i=f();if(!r.tagAnchor(e.id,i))continue;let o=n.calls.get(e.id);d.push({id:e.id,name:e.name,world:i,...o?{call:Y(`online.call.${o.call}`)}:{}})}let p=n.you===void 0?void 0:n.calls.get(n.you),m=t.snapshot.rider;if(p&&m[z.present]>0){let e=z.points+6,t=f().set(m[e],m[e+1]+.45,m[e+2]);d.push({id:n.you,name:``,world:t,call:Y(`online.call.${p.call}`)})}let h=this.renderer.domElement;i.update(d,c,h.clientWidth,h.clientHeight,this.showNameTags)}physicalRender(e,t){this.physicalMode.update(e||this.fixedStep),this.drawOnline(),this.setUnderwater(this.physicalMode.cameraBelowSurface()),this.drawPhysical(t??this.physicalMode.camera.camera)}pausedRender(e){this.physicalMode.update(0);let t=this.physicalMode.camera.camera;this.stillFrame.needsDraw(t,e,this.needsRender)&&(this.needsRender=!1,this.setUnderwater(this.physicalMode.cameraBelowSurface()),this.drawPhysical(t),this.stillFrame.drawn(t,e))}drawPhysical(e){this.water.update(),this.physicalMode.drawBarrel();let t=e.getWorldDirection(this.causticAhead).setY(0);t.lengthSq()>1e-6&&t.normalize();let n=this.physicalMode.host;n?.snapshot.status.compute===`gpu`&&this.graphics?.richSea!==!1?(this.fftChop.setWind(this.physicalSettings.windSpeed),this.fftChop.render(this.renderer,n.snapshot.status.seaTime)):this.fftChop.disable(),this.graphics?.caustics===!1?this.caustics.disable():this.caustics.render(this.renderer,e.position.x+t.x*48/3,e.position.z+t.z*48/3);let{board:r}=this.physicalMode,i=this.shadowNose.set(0,0,1).applyQuaternion(r.quaternion);this.shadows.follow(r.position,this.currentSunDirection(),r.position.y-.04,Math.atan2(i.x,i.z)),this.renderer.render(this.scene,e)}applyWaterLook(e){this.water.setLook(e),this.physicalMode.farField.setLook(e),this.physicalMode.spray.setLook(e),this.physicalMode.setSprayLook(e),this.physicalMode.lipSheet.setLook(e)}applySun(e){return this.shownSun={height:e.sunHeight,direction:e.sunDirection},this.environment.setSunPosition(e.sunHeight,e.sunDirection),this.photoSky.ready||(this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45),this.sunlight.intensity=1.2+.6*e.sunHeight,this.refreshSun(),this.refreshReflection()),this.photoSky.select(Cc(e.sunHeight),e.sunDirection).then(()=>this.usePhotoSky()).catch(e=>console.warn(`Photographed sky unavailable; keeping the painted sky.`,e))}usePhotoSky(){this.environment.showSky(!1),this.sunlight.color.copy(this.photoSky.sunColor),this.sunlight.intensity=this.photoSky.sunIntensity,this.sunlight.position.copy(this.photoSky.sunDirection).multiplyScalar(45),this.ambient.intensity=0,this.fill.intensity=0,this.reflectionMapTarget?.dispose(),this.reflectionMapTarget=void 0,this.photoSky.applyTo(this.scene,[this.water.mesh.material,this.physicalMode.farField.mesh.material,this.physicalMode.lipSheet.richMaterial]),this.isBelowSurface||(this.scene.background=this.photoSky.background??this.skyColor),this.refreshSun()}currentSunDirection(){return this.photoSky.ready?this.shadowSun.copy(this.photoSky.sunDirection):this.shadowSun.copy(this.environment.sunPosition).normalize()}refreshSun(){let e=this.photoSky.ready?this.photoSky.sunDirection.clone():this.environment.sunPosition.clone().normalize(),t=this.sunlight.color.clone().multiplyScalar(this.sunlight.intensity);this.water.setSun(e,t),this.physicalMode.farField.setSun(e,t),this.physicalMode.spray.setSun(e,t),this.physicalMode.lipSheet.setSun(e,t)}refreshReflection(){if(this.photoSky.ready)return;let e=this.environment.group.visible,t=this.scene.fog,n=this.scene.background;this.environment.group.visible=!0,this.scene.fog=null,this.scene.background=this.skyColor;let r=this.environment.group.scale.x,i=this.environment.group.position.clone();this.environment.group.scale.setScalar(1),this.environment.group.position.set(0,0,0);let a=[this.water.mesh,this.physicalMode.seabed.mesh,this.physicalMode.farField.mesh,this.physicalMode.lipSheet.mesh,this.physicalMode.bubbles.mesh,this.physicalMode.spray.mesh,this.environment.sunMesh],o=a.map(e=>e.visible);a.forEach(e=>{e.visible=!1});let s=new Mn(128),c=new Qt(.1,180,s);c.position.set(0,.6,0),c.update(this.renderer,this.scene);let l=new Cn(this.renderer),u=l.fromCubemap(s.texture);for(let e of[this.water.mesh.material,this.physicalMode.farField.mesh.material])e.envMap=u.texture,e.needsUpdate=!0;this.reflectionMapTarget?.dispose(),this.reflectionMapTarget=u,s.dispose(),l.dispose(),a.forEach((e,t)=>{e.visible=o[t]}),this.environment.group.visible=e,this.environment.group.scale.setScalar(r),this.environment.group.position.copy(i),this.scene.fog=t,this.scene.background=n}setUnderwater(e){this.isBelowSurface=e,this.environment.group.visible===e&&(this.scene.fog=e?this.underwaterFog:null,this.scene.background=e?this.underwaterColor:this.photoSky.background??this.skyColor,this.environment.group.visible=!e)}focusGame(){this.renderer.domElement.focus({preventScroll:!0})}pixelRatio(){return this.graphics?.pixelRatio??Math.min(window.devicePixelRatio||1,1.75)}resize(){this.needsRender=!0,this.renderer.setPixelRatio(this.pixelRatio()),this.renderer.setSize(window.innerWidth,window.innerHeight),this.physicalMode.camera.resize(window.innerWidth/Math.max(1,window.innerHeight))}};We(`diagnostics`)&&(globalThis.breaklineDiagnostics=Gg.recording),Pg&&new URLSearchParams(window.location.search).get(`pilot`)===`jev`?kg(async()=>{let{recordJevRide:e}=await import(`./jevRecorder-BOcMU1Ll.js`);return{recordJevRide:e}},__vite__mapDeps([0,1,2,3])).then(({recordJevRide:e})=>e(Gg.recording)):Pg&&kg(async()=>{let{recordRide:e}=await import(`./rideRecorder-CAV0PU41.js`);return{recordRide:e}},__vite__mapDeps([3,1,2])).then(({recordRide:e})=>e(Gg.recording)),Fg&&kg(async()=>{let{renderWaterSheet:e}=await import(`./waterSheet-B7Sm1p0h.js`);return{renderWaterSheet:e}},__vite__mapDeps([4,1,2])).then(({renderWaterSheet:e})=>e(Gg.recording)),Ig&&kg(async()=>{let{runParticleBench:e}=await import(`./particleBench-BKUUa6eD.js`);return{runParticleBench:e}},__vite__mapDeps([5,1,2])).then(({runParticleBench:e})=>e(Gg.recording));var Kg=typeof matchMedia==`function`&&matchMedia(`(prefers-reduced-motion: reduce)`).matches,qg=new ls(Wg(),$o(Kg)),Jg=Object.keys(Eo).find(e=>e===Xe(`graphics`)),Yg=()=>Gg.applyGraphics(No(Jg?ko(qg.value.graphics,Jg):qg.value.graphics,qg.value.detected,window.devicePixelRatio));Yg(),Gg.setSurfer(qg.value.surfer),Gg.setNameTags(qg.value.gameplay.nameTags),Gg.setPocketReflex(qg.value.gameplay.pocketReflex),Gg.setStance(qg.value.gameplay.stance),qg.subscribe((e,t)=>{(t===`graphics`||t===`detected`)&&Yg(),t===`surfer`&&Gg.setSurfer(e.surfer),t===`gameplay`&&(Gg.setNameTags(e.gameplay.nameTags),Gg.setPocketReflex(e.gameplay.pocketReflex),Gg.setStance(e.gameplay.stance))});var Xg=new Co;Ta(()=>Xg.pads()),Xg.start();var Zg=new $a(()=>qg.value.controls.bindings,{retry:()=>Qg.retry(),camera:()=>Gg.cycleView(),pause:()=>Qg.pause(),mute:()=>Qg.toggleMute(),call:e=>Qg.call(e)},{stick:()=>qg.value.controls}),Qg=new Fh(Gg,Zg,qg,{start:Pg||Fg||Ig?`stage`:Ng?`ride`:`menu`,steam:Xg});Gg.onFrame=(e,t)=>Qg.frame(e,t);export{il as n,Ql as t};