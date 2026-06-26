extends StaticBody2D



func hit():
	queue_free()

# Called when the node enters the scene tree for the first time.
func _ready():
	$Polygon2D.visible = false
	$PointLight2D.visible = false
	pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass


func _on_vision_area_body_entered(body):
	print("Nome:", body.name)
	print("Grupos:", body.get_groups())
	print("Tem die?", body.has_method("die"))

	if body.is_in_group("player"):
		body.die()
		

func player_caught(player):
	player.die()
#
func check_line_of_sight(player):
	$RayCast2D.target_position = to_local(player.global_position)
	$RayCast2D.force_raycast_update()
	
	if $RayCast2D.is_colliding():
		var collider = $RayCast2D.get_collider()
		
		if collider == player:
			player_caught(player)
