extends Node2D

var fill_color := Color("68d6c7")
var accent_color := Color("fff0b5")
var pose := 0.0:
	set(value):
		pose = value
		queue_redraw()

func animation(name: String, keys: Array[Vector2]) -> Animation:
	var result := Animation.new()
	result.resource_name = name
	result.length = 1.0
	result.loop_mode = Animation.LOOP_LINEAR
	var track := result.add_track(Animation.TYPE_VALUE)
	result.track_set_path(track, NodePath(".:pose"))
	result.value_track_set_update_mode(track, Animation.UPDATE_CONTINUOUS)
	for key in keys:
		result.track_insert_key(track, key.x, key.y)
	return result

func _ready() -> void:
	var library := AnimationLibrary.new()
	library.add_animation("idle", animation("idle", [Vector2(0.0, 0.0), Vector2(0.5, 0.18), Vector2(1.0, 0.0)]))
	library.add_animation("wave", animation("wave", [Vector2(0.0, 0.0), Vector2(0.5, 1.0), Vector2(1.0, 0.0)]))
	$AnimationPlayer.add_animation_library("", library)
	queue_redraw()

func sfhs_apply_variant(_variant_id: String, parameters: Dictionary) -> void:
	fill_color = Color(String(parameters.get("fill", "68d6c7")))
	accent_color = Color(String(parameters.get("accent", "fff0b5")))
	queue_redraw()

func _draw() -> void:
	var bounce := sin(pose * PI) * 2.0
	var body_center := Vector2(32, 43 - bounce)
	var left_hand := Vector2(17, 43 - bounce)
	var right_hand := Vector2(47 + pose * 4.0, 43 - bounce - pose * 12.0)
	draw_colored_polygon(PackedVector2Array([Vector2(21, 31 - bounce), Vector2(23, 22 - bounce), Vector2(29, 28 - bounce)]), fill_color)
	draw_colored_polygon(PackedVector2Array([Vector2(35, 28 - bounce), Vector2(41, 22 - bounce), Vector2(43, 31 - bounce)]), fill_color)
	draw_circle(body_center, 13.0, fill_color, true, -1.0, false)
	draw_circle(left_hand, 5.0, fill_color, true, -1.0, false)
	draw_circle(right_hand, 5.0, fill_color, true, -1.0, false)
	draw_circle(Vector2(28, 40 - bounce), 2.0, accent_color, true, -1.0, false)
	draw_circle(Vector2(36, 40 - bounce), 2.0, accent_color, true, -1.0, false)
	draw_line(Vector2(28, 48 - bounce), Vector2(36, 48 - bounce), accent_color, 2.0, false)
