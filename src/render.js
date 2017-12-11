import templateHTML from "./src/templates/main.html!text"
import rp from "request-promise"
import Mustache from "mustache"

export async function render() {
    return `<div class="map-wrapper">
    			<div class="base-map">
    				<img src="<%= path %>/assets/baseMap-01.png">
    			</div>
    		</div>`;
}