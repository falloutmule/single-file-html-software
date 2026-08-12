extends SceneTree

var failure_message := ""

func fail(message: String) -> void:
	failure_message = message
	push_error(message)
	quit(2)

func user_argument(name: String) -> String:
	var arguments := OS.get_cmdline_user_args()
	var index := arguments.find(name)
	if index < 0 or index + 1 >= arguments.size():
		return ""
	return arguments[index + 1]

func write_json(path: String, value: Variant) -> bool:
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(value, "  ", true) + "\n")
	file.close()
	return true

func _initialize() -> void:
	call_deferred("run_export")

func run_export() -> void:
	var config_path := user_argument("--config")
	var report_path := user_argument("--report")
	if config_path.is_empty() or report_path.is_empty():
		fail("SFHS Godot export requires --config and --report.")
		return
	var config_value: Variant = JSON.parse_string(FileAccess.get_file_as_string(config_path))
	if typeof(config_value) != TYPE_DICTIONARY:
		fail("SFHS Godot export config is invalid.")
		return
	var config: Dictionary = config_value
	var packed_scene: PackedScene = load(String(config["scene"]))
	if packed_scene == null:
		fail("SFHS Godot export scene could not be loaded.")
		return
	var frame_count := 0
	var variants: Array = config["variants"]
	var samples: Array = config["samples"]
	for variant_index in variants.size():
		# Each variant gets an isolated transparent render target and scene instance.
		# This prevents render-target history or animation state from crossing variants.
		var viewport := SubViewport.new()
		viewport.size = Vector2i(int(config["workingFrame"]["width"]), int(config["workingFrame"]["height"]))
		viewport.transparent_bg = true
		viewport.disable_3d = true
		viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
		viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		viewport.msaa_2d = Viewport.MSAA_DISABLED
		viewport.screen_space_aa = Viewport.SCREEN_SPACE_AA_DISABLED
		viewport.canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
		get_root().add_child(viewport)
		var instance := packed_scene.instantiate()
		viewport.add_child(instance)
		await process_frame
		if not instance.has_method("sfhs_apply_variant"):
			fail("Scene root must implement sfhs_apply_variant(variant_id, parameters).")
			return
		var player := instance.get_node_or_null(NodePath(String(config["animationPlayer"]))) as AnimationPlayer
		if player == null:
			fail("Configured AnimationPlayer node was not found.")
			return
		var variant: Dictionary = variants[variant_index]
		instance.call("sfhs_apply_variant", String(variant["id"]), variant["parameters"])
		await process_frame
		for sample_index in samples.size():
			var sample: Dictionary = samples[sample_index]
			var animation_name := StringName(String(sample["animation"]))
			if not player.has_animation(animation_name):
				fail("Animation not found: " + String(animation_name))
				return
			var animation := player.get_animation(animation_name)
			var sample_seconds := float(sample["timeSeconds"])
			if sample_seconds > animation.length:
				fail("Animation sample exceeds animation length: " + String(animation_name))
				return
			player.stop()
			player.play(animation_name)
			player.seek(sample_seconds, true, true)
			player.pause()
			instance.propagate_call("queue_redraw", [], true)
			await process_frame
			await process_frame
			var image := viewport.get_texture().get_image()
			if image == null or image.is_empty():
				fail("Viewport returned an empty image.")
				return
			image.convert(Image.FORMAT_RGBA8)
			var output_path := String(config["outputDirectory"]) + "/variant-%d-frame-%d.png" % [variant_index, sample_index]
			if image.save_png(output_path) != OK:
				fail("Could not save rendered frame.")
				return
			frame_count += 1
		viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
		viewport.queue_free()
		await process_frame
	var report := { "ok": true, "frameCount": frame_count, "renderer": RenderingServer.get_current_rendering_method() }
	if not write_json(report_path, report):
		fail("Could not write render report.")
		return
	quit(0)
